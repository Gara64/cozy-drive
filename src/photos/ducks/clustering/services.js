import { OPTICS } from 'density-clustering'
import KNN from './knn/knn'
import { cozyClient } from 'cozy-konnector-libs'

//import { DOCTYPE as DOCTYPE_ALBUM} from '../albums/index'

const ALBUM_DOCTYPE = 'io.cozy.photos.albums'

export const runOptics = (dataset, eps, metric) => {
  const optics = new OPTICS()
  const clusters = optics.run(dataset, eps, 1, metric)
  const plot = optics.getReachabilityPlot()
  const ordering = plot.map(p => p[0])
  const reachabilities = plot.map((p, i, plot) => plot[ordering[i]][1])
  const result = {
    ordering: ordering,
    reachabilities: reachabilities
  }
  return result
}

export const computeTemporalEps = (dataset, metric, percentile) => {
  metric.epsTemporal = computeEps(
    dataset,
    ['date'],
    metric.temporal,
    percentile
  )
  return metric.epsTemporal
}

export const computeSpatialEps = (dataset, metric, percentile) => {
  metric.epsSpatial = computeEps(
    dataset,
    ['lat', 'lon'],
    metric.spatial,
    percentile
  )
  return metric.epsSpatial
}

export const computeSpatioTemporalScaledEps = (dataset, metric, percentile) => {
  let eps = 0
  if (metric.epsTemporal !== undefined && metric.epsSpatial !== undefined) {
    eps = computeEps(
      dataset,
      ['date', 'lat', 'lon'],
      metric.spatioTemporalScaled,
      percentile
    )
  } else {
    eps = computeEps(
      dataset,
      ['date', 'lat', 'lon'],
      metric.spatioTemporal,
      percentile
    )
  }
  metric.eps = eps
  return eps
}

export const computeSpatioTemporalMaxNormalizedEps = (
  dataset,
  metric,
  percentile
) => {
  let eps = 0
  if (metric.epsTemporal !== undefined && metric.epsSpatial !== undefined) {
    eps = computeEps(
      dataset,
      ['date', 'lat', 'lon'],
      metric.spatioTemporalMaxNormalized,
      percentile
    )
  } else {
    eps = computeEps(
      dataset,
      ['date', 'lat', 'lon'],
      metric.spatioTemporal,
      percentile
    )
  }
  metric.eps = eps
  return eps
}

const computeEps = (dataset, dimensions, metric, percentile) => {
  // Compute the k-nearest neighbors on the data
  const knn = new KNN(dataset, metric, dimensions)
  const neighbors = knn.kNeighbors(dataset)

  // Extract the sorted distances and remove outliers
  let distances = neighbors.map(n => n.distance).sort((a, b) => a - b)
  distances = knn.excludeOutliers(distances, percentile)
  //console.log('distances : ', JSON.stringify(distances))

  // Compute the optimal eps for the given criterion
  const epsSlope = knn.epsSignificativeSlope(distances)
  const epsCurv = knn.epsMaxCurvative(distances)

  console.log('eps : ', epsSlope)

  //console.log('eps slope : ', epsSlope)
  //console.log('eps curv : ', epsCurv)

  //return (epsSlope + epsCurv) / 2
  return epsSlope
}

const albumName = photos => {
  if (photos.length === 1) {
    return JSON.stringify(new Date(photos[0].date * 3600 * 1000)).slice(1, 11)
  } else {
    const firstDate = new Date(photos[0].date * 3600 * 1000)
    const lastDate = new Date(photos[photos.length - 1].date * 3600 * 1000)
    const diff = photos[photos.length - 1].date - photos[0].date
    // Same day
    if (firstDate.getDate() === lastDate.getDate() && diff < 24) {
      return JSON.stringify(firstDate).slice(1, 11)
    } else {
      const fDate = JSON.stringify(firstDate).slice(1, 11)
      const lDate = JSON.stringify(lastDate).slice(1, 11)
      return fDate + ' - ' + lDate
    }
  }
}

// TODO: deal with ghost references, ie a file referencing several auto albums
// and thus one won't be used
const createReferences = async (album, photos) => {
  const ids = photos.map(p => p.id)
  console.log('create relations for ', ids)
  const result = await cozyClient.data.addReferencedFiles(album, ids)
  return result
}

const allAutoAlbums = async () => {
  const albums = await cozyClient.data.findAll(ALBUM_DOCTYPE)
  const filtered = albums.filter(album => album.auto)
  return filtered
}

const autoAlbumExists = (albums, name) => {
  return albums.find(album => album.name === name)
}

const createAutoAlbum = async (albums, photos) => {
  const name = albumName(photos)
  if (!autoAlbumExists(albums, name)) {
    const created_at = new Date()
    // TODO add fields period (d1 - d2) + place (gps1 - gps2)
    // this is useful for latter where we need the name to be a single date
    // as we use it to sort
    const album = { name, created_at, auto: true }
    return await cozyClient.data.create(ALBUM_DOCTYPE, album)
  }
}

export const saveResults = async clusters => {
  const autoAlbums = await allAutoAlbums()
  for (const photos of clusters) {
    const album = await createAutoAlbum(autoAlbums, photos)
    if (album) {
      await createReferences(album, photos)
    }
  }
}
