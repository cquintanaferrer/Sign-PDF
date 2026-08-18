import { Navigate } from "react-router-dom";

import { tokenStorage } from "../utils/token";

interface Props {
  children: React.JSX.Element;
}

export default function PrivateRoute({
  children,
}: Props) {

  if (!tokenStorage.has()) {
    return <Navigate to="/login" replace />;
  }

  return children;
}