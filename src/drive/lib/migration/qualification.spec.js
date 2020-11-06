import {
  extractFilesToMigrate,
  getFileRequalification,
  removeOldQualificationAttributes
} from 'drive/lib/migration/qualification'
import log from 'cozy-logger'

jest.mock('cozy-logger', () => jest.fn())


const saveQualification = jest.fn()

describe('qualification migration', () => {

  it('should extract files to migrate based on qualification attributes', () => {
    const fileNoQualif = {
      metadata: {
        datetime: '2020-01-01'
      }
    }
    const fileFullQualif = {
      metadata: {
        id: '1',
        label: 'dummy',
        classification: 'dummy',
        subClassification: 'dummy',
        categorie: 'dummy',
        category: 'dummy',
        categories: ['dummies'],
        subject: 'dummy',
        subjects: ['dummy']
      }
    }
    const files = [fileNoQualif, fileFullQualif]

    const filesToMigrate = extractFilesToMigrate(files)
    expect(filesToMigrate).toHaveLength(1)
    expect(filesToMigrate[0]).toEqual(fileFullQualif)
  })

  it('should get the new qualification for a file qualified by cozy-scanner', () => {
    const file = {
      metadata: {
        id: '22',
        classification: 'invoicing',
        categorie: 'health',
        label: 'health_invoice'
      }
    }
    const qualif = getFileRequalification(file)
    expect(qualif).toEqual({
      label: 'health_invoice',
      purpose: 'invoice',
      sourceCategory: 'health'
    })
  })

  it('should get the new qualification for a file qualified by a konnector', () => {
    const file = {
      metadata: {
        contentAuthor: 'ameli',
        classification: 'invoicing',
        categorie: 'health',
        label: 'health_invoice'
      }
    }
    const qualif = getFileRequalification(file)
    expect(qualif).toEqual({
      label: 'health_invoice',
      purpose: 'invoice',
      sourceCategory: 'health'
    })
  })

  it('should log an error null when no qualification is possible', () => {
    const file = {
      metadata: {
        label: 'fake_label'
      }
    }
    expect(getFileRequalification(file)).toBeNull()
    expect(log).toHaveBeenCalledWith('error', expect.anything())
  })

  it('should remove old qualification attributes', () => {
    const file = {
      metadata: {
        id: 1,
        label: 'label',
        classification: 'classification',
        subClassification: 'subClassification',
        categorie: 'categorie',
        category: 'category',
        categories: 'categories',
        subject: 'subject',
        subjects: 'subjects',
        datetime: '2020-10-10'
      }
    }
    expect(removeOldQualificationAttributes(file)).toEqual({
      metadata: {
        datetime: '2020-10-10'
      }
    })

    file.metadata = {}
    expect(removeOldQualificationAttributes(file)).toEqual(file)
  })
})