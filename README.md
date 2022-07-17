# http

> A declarative HTTP server.

## Usage

The server can be initialized by calling the `server` function from the module.

```typescript
import { server } from "@ianlucas/http";

server({
    port: 3000,
    on_listen() {
        console.log("Server is up and running!");
    }
});
```

### Creating Routes

A route is an object that has the structure shown bellow. All the routes should be included in the `routes` array during the initialization of the server.

```typescript
import { Request, Response, server } from "@ianlucas/http";

const index_route = {
    method: "get",
    path: "/",
    handler(request: Request, response: Response) {
        response.json({
            status: 200,
            data: "Hello, World!"
        });
    }
};

server({
// ...
    routes: [
        index_route
    ],
// ...
});

```

### Creating Plugins

For extending the application while keeping it simple to be used, plugins can be used. The [Express application](https://expressjs.com/en/4x/api.html#app) is passed as parameter for the plugin function. Plugins are loaded before the routes.

```typescript
function my_plugin(app) {
    do_something_with_app(app);
}

server({
// ...
    plugins: [
        my_plugin
    ],
// ...
});
```
