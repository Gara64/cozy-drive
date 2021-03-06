import { t } from 'testcafe'
import logger from '../../helpers/logger'
import {
  getPageUrl,
  isExistingAndVisible,
  checkAllImagesExists,
  overwriteCopyCommand,
  getLastExecutedCommand
} from '../../helpers/utils'
import * as selectors from '../selectors'
import { checkToastAppearsAndDisappears } from '../commons'
import PhotoPage from '../photos/photos-model'

export default class Page extends PhotoPage {
  async waitForLoading() {
    await t
      .expect(selectors.loading.exists)
      .notOk('Page didnt Load : selectors.loading exists')
    await isExistingAndVisible('selectors.albumContentWrapper')
    logger.debug(`album-model : waitForLoading Ok`)
  }

  //@param {string} when : text for logger.debug
  async getPhotosToAddCount(when) {
    await checkAllImagesExists()
    await isExistingAndVisible('selectors.photoSectionAddToAlbum')
    await isExistingAndVisible('selectors.allPhotosAddToAlbum')
    const allPhotosCount = await selectors.allPhotosAddToAlbum.count

    logger.debug(
      `Number of pictures ready to be added (${when} test):  ${allPhotosCount}`
    )
    return allPhotosCount
  }

  // @param {Number} indexStart : which photo is the 1st selected
  // @param {Number} numOfFiles : Number of photo to add (X photos from timeline)
  async selectPhotostoAdd(indexStart, numOfFiles) {
    logger.debug(`Selecting ${numOfFiles} picture(s) from index ${indexStart}`)
    for (let i = indexStart; i < indexStart + numOfFiles; i++) {
      await isExistingAndVisible(
        `selectors.photoThumb(${i})`,
        selectors.photoThumb(i)
      )
      await t.click(selectors.photoToAddCheckbox.nth(i))
    }
  }

  // @param {String} albumName : Name of the  album
  // @param { number } photoNumber : Number of photos expected in this album
  async checkAlbumPage(albumName, photoNumber) {
    await this.waitForLoading()
    await t
      .expect(getPageUrl())
      .contains('albums')
      .expect(getPageUrl())
      .notContains('new')
      .expect(selectors.albumTitle.innerText)
      .eql(albumName)

    if (photoNumber == 0) {
      await isExistingAndVisible('selectors.folderEmpty')
    } else {
      const allPhotosAlbumCount = await this.getPhotosCount('On Album page')
      await t.expect(allPhotosAlbumCount).eql(photoNumber) //all expected photos are displayed
    }
  }

  // @param {String} OldAlbumName : Name of the album (before renamming)
  // @param {String} NewAlbumName : New Name of the album (after renamming)
  // @param {string} exit : enter or click : Choose the exit method
  async renameAlbum(OldAlbumName, NewAlbumName, exitWithEnter) {
    await isExistingAndVisible('selectors.albumTitle')
    await t
      .expect(selectors.albumTitle.find('input').exists)
      .notOk('Title is already in input mode')
    await isExistingAndVisible('selectors.toolbarAlbum')
    await isExistingAndVisible('selectors.btnMoreMenu')
    await t.click(selectors.btnMoreMenu)
    await isExistingAndVisible('selectors.moreMenuRenameAlbum')
    await t.click(selectors.moreMenuRenameAlbum)
    await isExistingAndVisible(
      `selectors.albumTitle.find('input')`,
      selectors.albumTitle.find('input')
    )
    await t
      .expect(selectors.albumTitle.find('input').value)
      .eql(OldAlbumName)
      .expect(selectors.albumTitle.find('input').focused)
      .ok('Input Name is not focus')
      .typeText(selectors.albumTitle.find('input'), NewAlbumName)
    //exit input
    exitWithEnter
      ? await t.pressKey('enter')
      : await t.click(selectors.mainContent)
  }

  // @param { number } count : Number of photos already in the album (needed to know which photo to add)
  // @param { number } photoNumber : Number of photos to add to the new album (
  // @param {String} AlbumName : Name of the album
  async addPhotosToAlbum(albumName, count, photoNumber) {
    await isExistingAndVisible('selectors.toolbarAlbum')
    await isExistingAndVisible('selectors.btnMoreMenu')
    await t.click(selectors.btnMoreMenu)
    await isExistingAndVisible('selectors.moreMenuAddPhotosToAlbum')
    await t.click(selectors.moreMenuAddPhotosToAlbum)

    await this.checkAddToAlbumPage(albumName)
    await this.selectPhotostoAdd(count, photoNumber)
    await t.click(selectors.btnValidateAlbum)

    await isExistingAndVisible('selectors.alertWrapper')
    const modalTxt = (await selectors.alertWrapper.innerText).split(' ')
    await t.expect(modalTxt[modalTxt.length - 2]).eql(`${photoNumber}`)

    await this.checkAlbumPage(albumName, count + photoNumber)
  }

  // @param {String} AlbumName : Name of the album
  // @param {String} count : Number of photos already in the album (needed to count photos, as photos already in the album shows up twice)
  async checkAddToAlbumPage(albumName) {
    await t.expect(getPageUrl()).contains('edit')
    await isExistingAndVisible('selectors.pickerAlbumName')
    await t.expect(selectors.pickerAlbumName.innerText).eql(albumName)
    const photosToAddCount = await this.getPhotosToAddCount(
      'On Add to Album page'
    )
    await t.expect(photosToAddCount).eql(t.ctx.totalFilesCount) //all photos are displayed
    await isExistingAndVisible('selectors.btnValidateAlbum')
  }

  async backToAlbumsList() {
    await isExistingAndVisible('selectors.btnBackToAlbum')
    await t.click(selectors.btnBackToAlbum)
    await this.waitForLoading()
  }

  // @param { number } photoNumber : Number of photos to remove from the album (
  async removePhotoFromAlbum(photoNumber) {
    let photoAlbumStart
    if (!t.fixtureCtx.isVR) {
      photoAlbumStart = await this.getPhotosCount('In album, before')
    }
    await this.selectPhotos(photoNumber)
    await isExistingAndVisible('selectors.cozySelectionbar')

    logger.debug('Removing ' + photoNumber + ' picture(s)')
    await isExistingAndVisible('selectors.btnRemoveFromAlbumCozySelectionBar')
    await t.click(selectors.btnRemoveFromAlbumCozySelectionBar)

    await isExistingAndVisible('selectors.alertWrapper')
    await checkToastAppearsAndDisappears(
      'The photo has been removed from album'
    )
    if (!t.fixtureCtx.isVR) {
      const photoAlbumEnd = await this.getPhotosCount('In album, after')
      await t.expect(photoAlbumEnd).eql(photoAlbumStart - photoNumber)
    }
  }

  async deleteAlbum() {
    await isExistingAndVisible('selectors.toolbarAlbum')
    await isExistingAndVisible('selectors.btnMoreMenu')
    await t.click(selectors.btnMoreMenu)
    await isExistingAndVisible('selectors.moreMenuDeleteAlbum')
    await t.click(selectors.moreMenuDeleteAlbum)

    await isExistingAndVisible('selectors.modalFooter')
    await isExistingAndVisible('selectors.btnModalSecondButton')
    await t.click(selectors.btnModalSecondButton)
  }

  async shareAlbumPublicLink() {
    await isExistingAndVisible('selectors.toolbarAlbum')
    await isExistingAndVisible(`selectors.btnShareAlbum`)
    await t.click(selectors.btnShareAlbum)
    await isExistingAndVisible('selectors.divShareByLink')
    await isExistingAndVisible('selectors.toggleShareLink')
    await t
      .click(selectors.toggleShareLink)
      .expect(selectors.toggleShareLink.find('input').checked)
      .ok('toggle Link is unchecked')
      .expect(selectors.spanLinkCreating.exist)
      .notOk('Still creating Link')
    await isExistingAndVisible('selectors.btnCopyShareByLink')

    await overwriteCopyCommand()

    await t
      .click(selectors.btnCopyShareByLink)
      .expect(getLastExecutedCommand())
      .eql('copy') //check link copy actually happens

    await isExistingAndVisible('selectors.alertWrapper')
  }

  async unshareAlbumPublicLink() {
    await isExistingAndVisible('selectors.toolbarAlbum')
    await isExistingAndVisible(`selectors.btnShareAlbum`)
    await t.click(selectors.btnShareAlbum)
    await isExistingAndVisible('selectors.divShareByLink')
    await isExistingAndVisible('selectors.toggleShareLink')
    await t
      .click(selectors.toggleShareLink)
      .expect(selectors.toggleShareLink.find('input').checked)
      .notOk(`selectors.toggleShareLink.find('input') is checked`)
      .expect(selectors.btnCopyShareByLink.exists)
      .notOk('selectors.btnCopyShareByLink still exists')
      .pressKey('esc')

    await isExistingAndVisible(`selectors.btnShareAlbum`)
  }
}
