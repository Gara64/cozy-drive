import { cozyClient, log } from 'cozy-konnector-libs'
import { DOCTYPE_ALBUMS } from 'drive/lib/doctypes'
import uniq from 'lodash/uniq'

// An auto album name is the date of the first photo
const albumName = photos => {
  return photos[0].datetime
}

// An auto album period starts with the first photo and ends with the last one
const albumPeriod = photos => {
  const startDate = photos[0].datetime
  const endDate =
    photos.length > 1 ? photos[photos.length - 1].datetime : startDate
  return { start: startDate, end: endDate }
}

const updateAlbumPeriod = async (photos, album) => {
  const newPeriod = albumPeriod(photos)
  if (
    newPeriod.start !== album.period.start ||
    newPeriod.end !== album.period.end
  ) {
    const newAlbum = {
      ...album,
      period: newPeriod,
      name: photos[0].datetime
    }
    return cozyClient.data.update(DOCTYPE_ALBUMS, album, newAlbum)
  }
  return album
}

const addAutoAlbumReferences = async (photos, album) => {
  let refCount = 0
  try {
    const refsIds = []
    for (const photo of photos) {
      const albumId = photo.clusterId
      if (!albumId) {
        // The photo references nothing: it must be referenced
        refsIds.push(photo.id)
      } else if (albumId !== album._id) {
        // The photo references another album: remove it
        const refAlbum = await cozyClient.data.find(DOCTYPE_ALBUMS, albumId)
        await cozyClient.data.removeReferencedFiles(refAlbum, photo.id)
        refsIds.push(photo.id)
      }
    }
    if (refsIds.length > 0) {
      console.time('add refs')
      await cozyClient.data.addReferencedFiles(album, refsIds)
      console.timeEnd('add refs')
      log(
        'info',
        `${refsIds.length} photos clustered into: ${JSON.stringify(album._id)}`
      )
      refCount = refsIds.length
    } else {
      log('info', `Nothing to clusterize for ${album._id}`)
    }
  } catch (e) {
    log('error', e.reason)
  }
  return refCount
}

const createAutoAlbum = async photos => {
  const name = albumName(photos)
  const period = albumPeriod(photos)
  const created_at = new Date()
  const album = { name, created_at, auto: true, period }
  return cozyClient.data.create(DOCTYPE_ALBUMS, album)
}

const removeAutoAlbums = async albums => {
  for (const album of albums) {
    await cozyClient.data.delete(DOCTYPE_ALBUMS, album)
  }
}

const removeAutoAlbumReferences = async (photos, album) => {
  console.time('remove refs')
  await cozyClient.data.removeReferencedFiles(album, photos.map(p => p.id))
  for (const photo of photos) {
    photo.clusterId = ''
  }
  console.timeEnd('remove refs')
}

export const findAutoAlbums = async () => {
  const autoAlbumsIndex = await cozyClient.data.defineIndex(DOCTYPE_ALBUMS, [
    'auto',
    'name'
  ])

  let next = true
  let skip = 0
  let autoAlbums = []
  while (next) {
    const results = await cozyClient.data.query(autoAlbumsIndex, {
      selector: { auto: true },
      sort: [{ name: 'desc' }],
      skip: skip,
      wholeResponse: true
    })
    if (results && results.docs) {
      autoAlbums = autoAlbums.concat(results.docs)
      skip = autoAlbums.length
      if (!results.next) {
        next = false
      }
    }
  }
  return autoAlbums
}

const createClusters = async clusters => {
  let refsCount = 0
  for (const photos of clusters) {
    const album = await createAutoAlbum(photos)
    refsCount += await addAutoAlbumReferences(photos, album)
  }
  return refsCount
}

/**
 * Save the clusters in database. Each cluster consists of a set of photos
 * that must be referenced-by the same auto-album.
 * The clusterAlbums are the existing auto-albums that must be either updated
 * or deleted.
 *
 * @param {Object[]} clusters - Set of cluster of photos
 * @param {Object[]} clusterAlbums - Set of existing auto-albums
 * @returns {number} Number of references updated in database
 *
 */
export const saveClustering = async (clusters, clusterAlbums = []) => {
  let refsCount = 0
  if (clusterAlbums.length > 0) {
    const processedAlbumsIds = []
    for (const photos of clusters) {
      // Find the clusterIds for this set of photos
      const clusterIds = uniq(
        photos.filter(p => p.clusterId).map(p => p.clusterId)
      )
      if (clusterIds.length === 0) {
        // No clusterId : create the new cluster
        const album = await createAutoAlbum(photos)
        refsCount += await addAutoAlbumReferences(photos, album)
      } else if (clusterIds.length === 1) {
        const album = clusterAlbums.find(album => album._id === clusterIds[0])
        if (processedAlbumsIds.includes(album._id)) {
          // Album already processed for another cluster: remove the refs and create a new album
          await removeAutoAlbumReferences(photos, album)
          const newAlbum = await createAutoAlbum(photos)
          refsCount += await addAutoAlbumReferences(photos, newAlbum)
        } else {
          // Album not processed elsewhere: add the refs and update the period
          refsCount += await addAutoAlbumReferences(photos, album)
          const idx = clusterAlbums.findIndex(
            album => album._id === clusterIds[0]
          )
          clusterAlbums[idx] = await updateAlbumPeriod(photos, album)
          processedAlbumsIds.push(album._id)
        }
      } else {
        // More than one album are referenced by the cluster: remove the refs and create a new album
        for (const photo of photos) {
          // Remove the refs
          if (photo.clusterId) {
            const album = clusterAlbums.find(
              album => album._id === photo.clusterId
            )
            await removeAutoAlbumReferences([photo], album)
          }
        }
        // Create the album and add the refs
        const newAlbum = await createAutoAlbum(photos)
        refsCount += await addAutoAlbumReferences(photos, newAlbum)
      }
    }
    // Remove the "ghost" albums: they do not reference any files anymore
    const albumsToRemove = clusterAlbums.filter(
      album => !processedAlbumsIds.includes(album._id)
    )
    if (albumsToRemove.length > 0) {
      await removeAutoAlbums(albumsToRemove)
    }
  } else {
    // No album exist for these clusters: create them
    refsCount = await createClusters(clusters)
  }
  return refsCount
}
