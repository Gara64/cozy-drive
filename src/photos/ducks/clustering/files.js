import { cozyClient, log } from 'cozy-konnector-libs'
import { DOCTYPE_FILES, DOCTYPE_ALBUMS } from 'drive/lib/doctypes'

export const getChanges = async (lastSeq, limit) => {
  log('info', `Get changes on files since ${lastSeq}`)
  const result = await cozyClient.fetchJSON(
    'GET',
    `/data/${DOCTYPE_FILES}/_changes?include_docs=true&since=${lastSeq}`
  )
  // Filter the changes to only get non-trashed images.
  const photosChanges = result.results
    .map(res => {
      return { doc: res.doc, seq: res.seq }
    })
    .filter(res => {
      return (
        res.doc.class === 'image' &&
        !res.doc._id.includes('_design') &&
        !res.doc.trashed
      )
    })
    .slice(0, limit)

  const newLastSeq =
    photosChanges.length > 0
      ? photosChanges[photosChanges.length - 1].seq
      : null
  const photos = photosChanges.map(photo => photo.doc)
  return { photos, newLastSeq }
}

export const getFilesFromDate = async date => {
  // Note a file without a metadata.datetime would not be indexed: this is not
  // a big deal as this is only used to compute parameters
  const filesIndex = await cozyClient.data.defineIndex(DOCTYPE_FILES, [
    'metadata.datetime',
    'class',
    'trashed'
  ])
  const selector = {
    'metadata.datetime': { $gt: date },
    class: 'image',
    trashed: false
  }
  // The results are paginated
  let next = true
  let skip = 0
  let files = []
  while (next) {
    const result = await cozyClient.files.query(filesIndex, {
      selector: selector,
      wholeResponse: true,
      skip: skip
    })
    files = files.concat(result.data)
    skip = files.length
    // NOTE: this is because of https://github.com/cozy/cozy-stack/pull/598
    if (result.meta.count < Math.pow(2, 31) - 2) {
      next = false
    }
  }
  return files
}

export const getAllPhotos = async () => {
  const files = await cozyClient.data.findAll(DOCTYPE_FILES)
  return files.filter(file => file.class === 'image' && !file.trashed)
}

//TODO remove this ? not used yet
export const getAutoAlbumsByFileId = async id => {
  //console.log('get relationships for ', id)
  const file = await cozyClient.files.statById(id)
  if (
    file &&
    file.relationships &&
    file.relationships.referenced_by &&
    file.relationships.referenced_by.data
  ) {
    //FIXME keep only auto-albums, otherwise could impact when looking for 'unique' clusterid
    //console.log('relationship data : ', file.relationships.referenced_by.data)
    const data = file.relationships.referenced_by.data
      .filter(data => data.type === DOCTYPE_ALBUMS)
      .map(data => data.id)
    if (data.length > 1) {
      process.exit(0)
    }
    return data[0]
  }
  return
}

export const getFilesByAutoAlbum = async album => {
  album._type = DOCTYPE_ALBUMS
  let files = []
  let next = true
  let skip = 0
  while (next) {
    const result = await cozyClient.data.fetchReferencedFiles(album, {
      skip: skip,
      wholeResponse: true
    })
    if (result && result.included) {
      const includedFiles = result.included.map(included => {
        const attributes = included.attributes
        attributes.id = included.id
        attributes.clusterId = album._id
        return attributes
      })
      files = files.concat(includedFiles)
      skip = files.length
      if (result.meta.count < includedFiles.length) {
        next = false
      }
    } else {
      next = false
    }
  }
  return files
}
