import { asyncHandler } from '../middleware/httpError.js';
import { loginUser, registerUser } from '../services/auth.service.js';
import { parseLoginBody, parseRegisterBody } from '../validators/auth.validator.js';

export const registerHandler = asyncHandler(async (req, res) => {
  const parsed = parseRegisterBody(req.body);

  if (parsed.error) {
    return res.status(400).json({
      status: 'error',
      message: parsed.error,
    });
  }

  const result = await registerUser(parsed.value);
  res.status(201).json(result);
});

export const loginHandler = asyncHandler(async (req, res) => {
  const parsed = parseLoginBody(req.body);

  if (parsed.error) {
    return res.status(400).json({
      status: 'error',
      message: parsed.error,
    });
  }

  const result = await loginUser(parsed.value);
  res.status(200).json(result);
});

export const meHandler = asyncHandler(async (req, res) => {
  res.status(200).json({ user: req.user });
});
