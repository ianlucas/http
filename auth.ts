import {Application} from "express";
import session from "express-session";
import filestore from "session-file-store";

const FileStore = filestore(session);

interface IAuthSpec {
    session_secret: string;
    session_path?: string;
}

function auth(app: Application, spec: IAuthSpec) {
    const filestore_options = {
        path: spec.session_path || "./sessions"
    };
    const session_handler = session({
        secret: spec.session_secret,
        resave: false,
        saveUninitialized: true,
        store: new FileStore(filestore_options)
    });
    app.use(session_handler);
}

export default auth;