import React from 'react';
import { Navigate } from 'react-router-dom';

// Superseded by SettingsPage (../SettingsPage) — this page used to POST a JSON body that didn't
// match the backend's UserEditModel (causing the "/api/Account/edit/user" 404) and passed an
// empty src="" straight to <Avatar>. SettingsPage sends the correct multipart/form-data shape
// via useEditUserMutation and only renders a src once a real preview URL exists. Kept as a thin
// redirect (rather than deleted) so any stale link to /update-profile still lands somewhere valid.
const EditAccountPage: React.FC = () => <Navigate replace to="/settings" />;

export default EditAccountPage;
