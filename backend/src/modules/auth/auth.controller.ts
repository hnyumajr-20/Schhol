import type { Request, Response } from "express";
import * as authService from "./auth.service";

export async function loginHandler(req: Request, res: Response) {
  const { identifier, password } = req.body;
  const { accessToken, refreshToken, user } = await authService.login(identifier, password);
  res.cookie(authService.REFRESH_COOKIE_NAME, refreshToken, authService.REFRESH_COOKIE_OPTIONS);
  res.json({ access_token: accessToken, user });
}

export async function refreshHandler(req: Request, res: Response) {
  const token = req.cookies?.[authService.REFRESH_COOKIE_NAME];
  const { accessToken, refreshToken, user } = await authService.refresh(token);
  res.cookie(authService.REFRESH_COOKIE_NAME, refreshToken, authService.REFRESH_COOKIE_OPTIONS);
  res.json({ access_token: accessToken, user });
}

export async function logoutHandler(req: Request, res: Response) {
  const token = req.cookies?.[authService.REFRESH_COOKIE_NAME];
  await authService.logout(token);
  res.clearCookie(authService.REFRESH_COOKIE_NAME, { path: authService.REFRESH_COOKIE_OPTIONS.path });
  res.status(204).send();
}

export async function changePasswordHandler(req: Request, res: Response) {
  const { current_password, new_password } = req.body;
  await authService.changePassword(req.user!.id, current_password, new_password);
  res.status(204).send();
}

export async function forgotPasswordHandler(req: Request, res: Response) {
  await authService.forgotPassword(req.body.email);
  res.status(204).send();
}

export async function resetPasswordHandler(req: Request, res: Response) {
  await authService.resetPassword(req.params.token, req.body.new_password);
  res.status(204).send();
}
