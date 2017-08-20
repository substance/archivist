import DocumentsPage from './DocumentsPage'

export default {
  name: 'archivist-documents',
  configure: function(config) {
    config.addPage('archive', DocumentsPage)
    config.addLabel('documents', {
      en: 'Documents',
      ru: 'Документы'
    })
  }
}