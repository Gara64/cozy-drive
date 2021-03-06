import React, { Component } from 'react'
import { connect } from 'react-redux'
import classNames from 'classnames'
import { translate } from 'cozy-ui/transpiled/react/I18n'
import { ActionMenu, Button, MenuItem, Icon } from 'cozy-ui/transpiled/react'
import { toggleThumbnailSize } from '../navigation/duck/actions'
import iconList from 'drive/assets/icons/icon-list.svg'
import iconListMin from 'drive/assets/icons/icon-list-min.svg'

import {
  sortFolder,
  getSort,
  getOpenedFolderId
} from 'drive/web/modules/navigation/duck'

import styles from 'drive/styles/filelist.styl'

const SORTABLE_ATTRIBUTES = [
  { label: 'name', attr: 'name', css: 'file', defaultOrder: 'asc' },
  { label: 'update', attr: 'updated_at', css: 'date', defaultOrder: 'desc' }
  // TODO: activate sorting by size when it's ready on the back side
  // { label: 'size', attr: 'size', css: 'size', defaultOrder: 'desc' }
]
const DEFAULT_SORT = { attribute: 'name', order: 'asc' }

const HeaderCell = ({ t, label, css }) => (
  <div
    className={classNames(
      styles['fil-content-header'],
      styles[`fil-content-${css}`]
    )}
  >
    {t(`table.head_${label}`)}
  </div>
)

const SortableHeaderCell = ({
  t,
  label,
  attr,
  css,
  order = null,
  defaultOrder,
  onSort
}) => (
  <div
    onClick={() =>
      onSort(attr, order ? (order === 'asc' ? 'desc' : 'asc') : defaultOrder)
    }
    className={classNames(
      styles['fil-content-header'],
      styles[`fil-content-${css}`],
      {
        [styles['fil-content-header-sortableasc']]:
          order === null && defaultOrder === 'asc',
        [styles['fil-content-header-sortabledesc']]:
          order === null && defaultOrder === 'desc',
        [styles['fil-content-header-sortasc']]: order === 'asc',
        [styles['fil-content-header-sortdesc']]: order === 'desc'
      }
    )}
  >
    {t(`table.head_${label}`)}
  </div>
)

const MobileSortMenu = ({ t, sort, onSort, onClose }) => (
  <ActionMenu onClose={onClose}>
    <div className={styles['fil-sort-menu']}>
      {SORTABLE_ATTRIBUTES.map(({ attr }) => [
        { attr, order: 'asc' },
        { attr, order: 'desc' }
      ])
        .reduce((acc, val) => [...acc, ...val], [])
        .map(({ attr, order }) => (
          <MenuItem
            key={`key_${attr}_${order}`}
            className={classNames(styles['fil-sort-menu-item'], {
              [styles['fil-sort-menu-item-selected']]:
                sort.order === order && sort.attribute === attr
            })}
            onClick={() => {
              onSort(attr, order)
              onClose()
            }}
          >
            {t(`table.mobile.head_${attr}_${order}`)}
          </MenuItem>
        ))}
    </div>
  </ActionMenu>
)

class MobileHeader extends Component {
  state = {
    showSortMenu: false
  }

  showSortMenu = () => this.setState({ showSortMenu: true })
  hideSortMenu = () => this.setState({ showSortMenu: false })

  render() {
    const {
      t,
      folderId,
      canSort,
      sort,
      onFolderSort,
      thumbnailSizeBig,
      toggleThumbnailSize
    } = this.props
    if (!canSort) return null
    const actualSort = sort || DEFAULT_SORT
    return (
      <div
        className={classNames(
          styles['fil-content-mobile-head'],
          styles['fil-content-row-head']
        )}
      >
        <div
          onClick={this.showSortMenu}
          className={classNames(styles['fil-content-mobile-header'], {
            [styles['fil-content-header-sortasc']]: actualSort.order === 'asc',
            [styles['fil-content-header-sortdesc']]: actualSort.order === 'desc'
          })}
        >
          {t(`table.mobile.head_${actualSort.attribute}_${actualSort.order}`)}
        </div>
        {this.state.showSortMenu && (
          <MobileSortMenu
            t={t}
            sort={actualSort}
            onClose={this.hideSortMenu}
            onSort={(attr, order) => onFolderSort(folderId, attr, order)}
          />
        )}
        <div
          className={classNames(
            styles['fil-content-mobile-header'],
            styles['fil-content-header-action']
          )}
        >
          <Button
            theme={'action'}
            onClick={() => {
              toggleThumbnailSize()
            }}
            label={t('table.head_thumbnail_size')}
            extension="narrow"
            icon={
              <Icon
                icon={thumbnailSizeBig ? iconListMin : iconList}
                size={17}
                label={t('table.head_thumbnail_size')}
              />
            }
            iconOnly
          />
        </div>
      </div>
    )
  }
}

const FileListHeader = ({
  t,
  folderId,
  canSort,
  sort,
  onFolderSort,
  thumbnailSizeBig,
  toggleThumbnailSize
}) => {
  const actualSort = sort || DEFAULT_SORT
  return (
    <div
      className={classNames(
        styles['fil-content-head'],
        styles['fil-content-row-head']
      )}
    >
      <div
        className={classNames(
          styles['fil-content-header'],
          styles['fil-content-file-select']
        )}
      />
      {SORTABLE_ATTRIBUTES.map((props, index) => {
        if (!canSort) {
          return <HeaderCell {...props} t={t} key={index} />
        }
        const isActive = actualSort && actualSort.attribute === props.attr
        return (
          <SortableHeaderCell
            key={`key_cell_${index}`}
            {...props}
            t={t}
            order={isActive ? actualSort.order : null}
            onSort={(attr, order) => onFolderSort(folderId, attr, order)}
          />
        )
      })}
      <div
        className={classNames(
          styles['fil-content-header'],
          styles['fil-content-size']
        )}
      >
        {t('table.head_size')}
      </div>
      <div
        className={classNames(
          styles['fil-content-header'],
          styles['fil-content-header-status']
        )}
      >
        {t('table.head_status')}
      </div>
      <div
        className={classNames(
          styles['fil-content-header'],
          styles['fil-content-header-action']
        )}
      >
        {/** in order to not display this button in a MoveModal for instance */}
        {canSort && (
          <Button
            theme={'action'}
            onClick={() => {
              toggleThumbnailSize()
            }}
            label={t('table.head_thumbnail_size')}
            extension="narrow"
            icon={
              <Icon
                icon={thumbnailSizeBig ? iconListMin : iconList}
                size={17}
                label={t('table.head_thumbnail_size')}
              />
            }
            iconOnly
          />
        )}
      </div>
    </div>
  )
}

const mapStateToProps = state => ({
  sort: getSort(state),
  folderId: getOpenedFolderId(state),
  thumbnailSizeBig: state.view.thumbnailSize
})
const mapDispatchToProps = dispatch => ({
  onFolderSort: (folderId, attr, order) =>
    dispatch(sortFolder(folderId, attr, order)),
  toggleThumbnailSize: () => dispatch(toggleThumbnailSize())
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(translate()(FileListHeader))
export const MobileFileListHeader = connect(
  mapStateToProps,
  mapDispatchToProps
)(translate()(MobileHeader))
