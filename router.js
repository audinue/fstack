function Router () {
    var handlers = []

    function router (request) {
        var newRequest = Object.assign({
            base: '',
            params: {}
        }, request)
        for (var i = 0; i < handlers.length; i++) {
            var result = handlers[i](newRequest)
            if (result !== undefined) {
                return result
            }
        }
    }

    router.use = function (prefix, handler) {
        if (typeof prefix === 'function') {
            handlers.push(prefix)
        } else {
            handlers.push(function (request) {
                if (request.path.substring(0, prefix.length) === prefix) {
                    var newPath = request.path.substring(prefix.length)
                    return handler(Object.assign({}, request, {
                        path: newPath === '' ? '/' : newPath,
                        base: request.base + prefix.substring(0, prefix.length),
                        original: request
                    }))
                }
            })
        }
        return router
    }

    function createMethod (method) {
        return function (path, handler) {
            if (typeof path === 'function') {
                handlers.push(function (request) {
                    if (method === 'ALL' || request.method === method) {
                        return path(request)
                    }
                })
            } else {
                var regExp = new RegExp(
                    '^'
                    + path.replace(/:([^\/]+)/g, function (_, name) {
                        return '(?<' + name + '>[^/]+)'
                    })
                    + '$'
                )
                handlers.push(function (request) {
                    if ((method === 'ALL' || request.method === method) && regExp.test(request.path)) {
                        return handler(Object.assign({}, request, {
                            params: request.path.match(regExp).groups
                        }))
                    }
                })
            }
            return router
        }
    }

    router.all = createMethod('ALL')
    router.get = createMethod('GET')
    router.post = createMethod('POST')
    router.put = createMethod('PUT')
    router.patch = createMethod('PATCH')
    router.delete = createMethod('DELETE')

    return router
}
