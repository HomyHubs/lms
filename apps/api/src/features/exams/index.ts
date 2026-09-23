export { examsRoutes } from './routes.js'
export { makeExamsStore } from './store.js'
export {
  listExams,
  createExam,
  startAttempt,
  getAttempt,
  submitAttempt,
  generatePaper,
  type ExamsStore,
  type ExamRow,
  type AttemptRow,
  type QuestionLite,
  type LevelRef,
  type CreateExamFields,
  type CreateAttemptFields,
  type CreateExamOutcome,
  type StartAttemptOutcome,
  type GetAttemptOutcome,
  type SubmitAttemptOutcome,
} from './service.js'
