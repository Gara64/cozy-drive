import { DOCTYPE_ALBUMS } from 'drive/lib/doctypes'

/**
 * Returns the photos metadata sorted by date, from oldest to newest
 * @param {Object[]} photos - Set of photos
 * @returns {Object[]} The metadata's photos sorted by date
 */
export const prepareDataset = (photos, albums = []) => {
  const albumIds = albums.map(album => album._id)

  const info = photos
    .map(file => {
      //console.log('file : ', file)
      const photo = {
        id: file._id || file.id,
        clusterId: file.clusterId
      }
      // Depending on the query, the attributes object might exists, or not
      const attributes = file.attributes ? file.attributes : file
      //console.log('attributes : ', attributes)
      photo.name = attributes.name
      if (attributes.metadata) {
        const metadata = attributes.metadata
        photo.datetime = metadata.datetime
        photo.lat = metadata.gps ? metadata.gps.lat : null
        photo.lon = metadata.gps ? metadata.gps.long : null
      } else {
        photo.datetime = attributes.created_at
      }
      const hours = new Date(photo.datetime).getTime() / 1000 / 3600
      photo.timestamp = hours
      // For each photo, we need to check the clusterid, i.e. the auto-album
      // referenced by the file. If there is none, the photo wasn't clustered before
      if (
        !photo.clusterId &&
        file.relationships &&
        file.relationships.referenced_by &&
        file.relationships.referenced_by.data
      ) {
        const ref = file.relationships.referenced_by.data.find(
          ref => ref.type === DOCTYPE_ALBUMS && albumIds.includes(ref.id)
        )
        if (ref) {
          photo.clusterId = ref.id
        }
      }
      return photo
    })
    .sort((pa, pb) => pa.timestamp - pb.timestamp)

  return info
}

/**
 * Compute the mean date based on the photos' timestamp
 * @param {Object[]} photos - Set of photos
 * @returns {Date} The average date
 */
export const averageTime = photos => {
  const sumHours = photos.reduce((acc, val) => acc + val.timestamp, 0)
  const averageHours = sumHours / photos.length
  return new Date(averageHours * 3600 * 1000).getTime()
}
