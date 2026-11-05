export { mediaRoutes } from './routes.js'
export { makeMediaStore } from './store.js'
export { makeLocalMediaStorage, makeMemoryMediaStorage, type MediaStorage } from './storage.js'
export { sniffImage, stripMetadata, type ImageInfo } from './image.js'
export {
  uploadMedia,
  readMedia,
  getQuestionMedia,
  setQuestionMedia,
  type MediaStore,
  type MediaAssetRow,
  type QuestionMediaRow,
} from './service.js'
