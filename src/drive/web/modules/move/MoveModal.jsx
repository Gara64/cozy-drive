import React from 'react'
import PropTypes from 'prop-types'
import {
  Modal,
  ModalFooter,
  ContextHeader,
  withBreakpoints
} from 'cozy-ui/react'
import { Query } from 'cozy-client'
import Topbar from 'drive/web/modules/layout/Topbar'
import { ROOT_DIR_ID, TRASH_DIR_ID } from 'drive/constants/config'
import Alerter from 'cozy-ui/react/Alerter'
import DriveIcon from 'drive/assets/icons/icon-drive.svg'
import get from 'lodash/get'

import cx from 'classnames'

import FileList from 'drive/web/modules/filelist/FileList'
import FileListHeader, {
  MobileFileListHeader
} from 'drive/web/modules/filelist/FileListHeader'
import FileListBody from 'drive/web/modules/filelist/FileListBody'
import FileListRows from 'drive/web/modules/filelist/FileListRows'
import { DumbFile as File } from 'drive/web/modules/filelist/File'
import fileListStyles from 'drive/styles/filelist'
import Oops from 'components/Error/Oops'
import { EmptyDrive } from 'components/Error/Empty'
import FileListRowsPlaceholder from 'drive/web/modules/filelist/FileListRowsPlaceholder'
import LoadMore from 'drive/web/modules/filelist/LoadMore'

import {
  Breadcrumb,
  PreviousButton,
  renamePathNames
} from 'drive/web/modules/navigation/Breadcrumb'
import getFolderPath from 'drive/web/modules/navigation/getFolderPath'

const MoveTopbar = withBreakpoints()(
  ({ navigateTo, path, breakpoints: { isMobile } }) => (
    <Topbar hideOnMobile={false}>
      {path.length > 1 &&
        isMobile && (
          <PreviousButton onClick={() => navigateTo(path[path.length - 2])} />
        )}
      <Breadcrumb path={path} onBreadcrumbClick={navigateTo} opening={false} />
    </Topbar>
  )
)

class MoveModal extends React.Component {
  state = {
    folderId: ROOT_DIR_ID
  }

  navigateTo = folder => {
    this.setState({ folderId: folder.id })
  }

  moveEntries = async () => {
    const { entries, onClose } = this.props
    const { client } = this.context
    const { folderId } = this.state

    const entry = entries[0]

    try {
      await client
        .collection('io.cozy.files')
        .updateFileMetadata(entry._id, { dir_id: folderId })
      Alerter.info('*Thing* has been moved to *destination*', {
        buttonText: 'cancel',
        buttonAction: () => console.log('cancel move plz')
      })
    } catch (e) {
      console.warn(e)
      Alerter.error('move error')
    } finally {
      onClose({
        cancelSelection: true
      })
    }
  }

  isValidMoveTarget = file => {
    const { entries } = this.props
    const isAnEntry = entries.find(entry => entry._id === file._id)

    return file.type === 'file' || isAnEntry
  }

  buildBreadcrumbPath = data =>
    renamePathNames(
      getFolderPath({
        ...data,
        parent: get(data, 'relationships.parent.data')
      }),
      '',
      this.context.t
    )

  render() {
    const { onClose, entries } = this.props
    const { client, t } = this.context
    const { folderId } = this.state

    const contentQuery = client =>
      client
        .find('io.cozy.files')
        .where({
          dir_id: folderId,
          _id: {
            $ne: TRASH_DIR_ID
          }
        })
        .sortBy([{ type: 'asc' }, { name: 'asc' }])

    const breadcrumbQuery = client => client.get('io.cozy.files', folderId)

    return (
      <Modal size={'xlarge'} closable={false} overflowHidden mobileFullscreen>
        <ContextHeader
          title={entries[0].name}
          text={t('Move.to')}
          icon={DriveIcon}
          onClose={onClose}
        />
        <Query query={breadcrumbQuery} key={`breadcrumb-${folderId}`}>
          {({ data, fetchStatus }) => {
            return fetchStatus === 'loaded' ? (
              <MoveTopbar
                navigateTo={this.navigateTo}
                path={this.buildBreadcrumbPath(data)}
              />
            ) : (
              false
            )
          }}
        </Query>
        <Query query={contentQuery} key={`content-${folderId}`}>
          {({ data, fetchStatus, hasMore, fetchMore, ...rest }) => {
            if (fetchStatus === 'loading') return <FileListRowsPlaceholder />
            else if (fetchStatus === 'failed') return <Oops />
            else if (fetchStatus === 'loaded' && data.length === 0)
              return <EmptyDrive canUpload={false} />
            else
              return (
                <div
                  className={fileListStyles['fil-content-table']}
                  role="table"
                >
                  <MobileFileListHeader canSort={false} />
                  <FileListHeader canSort={false} />
                  <div className={fileListStyles['fil-content-body']}>
                    {/*Missing FileListBody providing the add folder component */}
                    <div>
                      {data.map(file => (
                        <File
                          key={file.id}
                          disabled={this.isValidMoveTarget(file)}
                          attributes={file}
                          displayedFolder={null}
                          actions={null}
                          isRenaming={false}
                          onFolderOpen={id =>
                            this.navigateTo(data.find(f => f.id === id))
                          }
                          onFileOpen={null}
                          withSelectionCheckbox={false}
                          withFilePath={false}
                          withSharedBadge={true}
                        />
                      ))}
                      {hasMore && (
                        <LoadMore onClick={fetchMore} isLoading={false} />
                      )}
                    </div>
                  </div>
                </div>
              )
          }}
        </Query>
        <ModalFooter
          primaryText={t('Move.action')}
          primaryAction={this.moveEntries}
          secondaryText={t('Move.cancel')}
          secondaryAction={onClose}
          secondaryType="secondary"
        />
      </Modal>
    )
  }
}

MoveModal.PropTypes = {
  entries: PropTypes.array
}

export default MoveModal
