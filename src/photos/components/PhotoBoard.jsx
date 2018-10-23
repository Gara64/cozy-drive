import styles from '../styles/photoList'

import React, { Component } from 'react'
import { withContentRect } from 'react-measure'
import { translate } from 'cozy-ui/react/I18n'

import PhotoList from './PhotoList'
import { EmptyPhotos } from 'components/Error/Empty'
import Loading from './Loading'
import ErrorComponent from 'components/Error/ErrorComponent'
import LoadMoreButton from './LoadMoreButton'

export class PhotoBoard extends Component {
  render() {
    const {
      f,
      lists,
      selected,
      photosContext,
      showSelection,
      onPhotoToggle,
      onPhotosSelect,
      onPhotosUnselect,
      fetchStatus,
      hasMore,
      fetchMore,
      measureRef,
      contentRect: {
        entry: { width }
      }
    } = this.props

    console.log('function f : ', f)

    const isError = fetchStatus === 'failed'
    const isFetching = fetchStatus === 'pending' || fetchStatus === 'loading'

    if (isError) {
      return <ErrorComponent errorType={`${photosContext}_photos`} />
    }
    if (isFetching) {
      return <Loading loadingType="photos_fetching" />
    }
    if (!isFetching && (lists.length === 0 || lists[0].photos.length === 0)) {
      return <EmptyPhotos localeKey={`${photosContext}_photos`} />
    }

    return (
      <div
        className={showSelection ? styles['pho-list-selection'] : ''}
        ref={measureRef}
      >
        {lists.map(photoList => (
          <PhotoList
            key={photoList.title || photoList.day}
            title={
              photoList.title ||
              (photoList.day ? f(photoList.day, 'DD MMMM YYYY') : '')
            }
            /*title={
              photoList.title || ''
            }*/
            photos={photoList.photos}
            selected={selected}
            showSelection={showSelection}
            onPhotoToggle={onPhotoToggle}
            onPhotosSelect={onPhotosSelect}
            onPhotosUnselect={onPhotosUnselect}
            containerWidth={width}
          />
        ))}
        {hasMore && <LoadMoreButton width={width} onClick={fetchMore} />}
      </div>
    )
  }
}

export default translate()(withContentRect()(PhotoBoard))
