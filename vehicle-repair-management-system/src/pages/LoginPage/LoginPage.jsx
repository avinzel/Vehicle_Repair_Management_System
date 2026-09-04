import { LoginForm } from "./LoginForm"
export function LoginPage({authenticateUser}) {
    return (
        <>
            <LoginForm authenticateUser = {authenticateUser}/>
        </>
    )
}