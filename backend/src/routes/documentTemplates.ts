import { Router } from 'express';
import { authenticate } from '../middleware/auth/authenticate';
import { authorize } from '../middleware/rbac/authorize';
import {
  listTemplates, getTemplate, createTemplate, updateTemplate, deleteTemplate, templateValidators,
  getTemplateUploadUrl,
} from '../controllers/documentTemplateController';

const router = Router();
router.use(authenticate);

router.get('/', authorize('document_templates', 'read'), listTemplates);
router.post('/upload-url', authorize('document_templates', 'update'), getTemplateUploadUrl);
router.get('/:id', authorize('document_templates', 'read'), getTemplate);
router.post('/', authorize('document_templates', 'create'), templateValidators, createTemplate);
router.put('/:id', authorize('document_templates', 'update'), updateTemplate);
router.delete('/:id', authorize('document_templates', 'delete'), deleteTemplate);

export default router;
