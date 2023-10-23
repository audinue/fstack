function serve (handle) {
    function createRequest (method, uri, body) {
        var url = new URL(uri, 'http://0')
        return {
            method: method,
            uri: uri,
            body: body,
            path: url.pathname,
            query: url.searchParams
        }
    }

    function respond (request) {
        return Promise.resolve(handle(request))
            .then(function (result) {
                if (result === undefined) {
                    return {
                        uri: request.uri,
                        html: '<pre>Unable to ' + request.method + ' ' + request.path + '</pre>'
                    }
                } else if (result.charAt(0) === '/') {
                    return respond(createRequest('GET', result))
                } else {
                    return {
                        uri: request.uri,
                        html: result
                    }
                }
            })
            .catch(function (error) {
                console.error(error)
                return {
                    uri: request.uri,
                    html: '<pre>' + error.stack + '</pre>'
                }
            })
    }

    var lastRequest

    function focus () {
        var element = document.querySelector('[autofocus]')
        if (element) {
            element.focus()
        }
    }

    function push (request) {
        lastRequest = request
        respond(request)
            .then(function (response) {
                if (lastRequest === request) {
                    scrollTo(0, 0)
                    document.body.innerHTML = response.html
                    focus()
                    history.pushState(
                        {
                            html: response.html,
                            scrollX: 0,
                            scrollY: 0,
                            scrollables: []
                        },
                        0,
                        '#' + response.uri
                    )
                }
            })
    }

    function replace (request) {
        lastRequest = request
        respond(request)
            .then(function (response) {
                if (lastRequest === request) {
                    scrollTo(0, 0)
                    document.body.innerHTML = response.html
                    focus()
                    history.replaceState(
                        {
                            html: response.html,
                            scrollX: 0,
                            scrollY: 0,
                            scrollables: []
                        },
                        0,
                        '#' + response.uri
                    )
                }
            })
    }

    addEventListener('DOMContentLoaded', function () {
        if (history.state === null) {
            replace(
                createRequest(
                    'GET',
                    location.hash === ''
                        ? '/'
                        : location.hash.substring(1)
                )
            )
        } else {
            respond(createRequest('GET', location.hash.substring(1)))
                .then(function (response) {
                    document.body.innerHTML = response.html
                    scrollTo(history.state.scrollX, history.state.scrollY)
                    history.state.scrollables.forEach(restoreScrollable)
                    history.replaceState(
                        Object.assign(history.state, { html: response.html }),
                        0,
                        location.hash
                    )
                })
        }
    })

    addEventListener('beforeunload', function () {
        history.replaceState(
            Object.assign(history.state, {
                scrollX: scrollX,
                scrollY: scrollY,
                scrollables: getScrollables()
            }),
            0,
            location.hash
        )
    })

    addEventListener('click', function (e) {
        if (e.target.nodeName === 'A'
            && e.target.getAttribute('href') !== null
            && (
                e.target.getAttribute('href').charAt(0) === '/'
                || e.target.getAttribute('href').substring(0, 2) === '#/'
            )
        ) {
            e.preventDefault()
            push(createRequest('GET', e.target.getAttribute('href').replace(/^#\//, '/')))
        }
    })

    addEventListener('submit', function (e) {
        if (
            e.target.getAttribute('action') === null
            || e.target.getAttribute('action').charAt(0) === '/'
        ) {
            e.preventDefault()
            history.replaceState(
                Object.assign(history.state, {
                    scrollX: scrollX,
                    scrollY: scrollY,
                    scrollables: getScrollables()
                }),
                0,
                location.hash
            )
            if (e.target.getAttribute('method') === null
                || e.target.getAttribute('method').toUpperCase() === 'GET'
            ) {
                var url = new URL(
                    e.target.getAttribute('action') || location.hash.substring(1),
                    'http://0'
                )
                new FormData(e.target, e.submitter)
                    .forEach(function (value, key) {
                        url.searchParams.set(key, value)
                    })
                push(
                    createRequest(
                        'GET',
                        url.pathname + '?' + url.searchParams
                    )
                )
            } else {
                push(
                    createRequest(
                        e.target.getAttribute('method').toUpperCase(),
                        e.target.getAttribute('action') || location.hash.substring(1),
                        new FormData(e.target, e.submitter)
                    )
                )
            }
        }
    })

    var popState = 0

    addEventListener('popstate', function (e) {
        switch (popState) {
            case 0:
                if (history.state === null) {
                    popState = 1
                    history.back()
                } else {
                    document.body.innerHTML = history.state.html
                    scrollTo(history.state.scrollX, history.state.scrollY)
                    history.state.scrollables.forEach(restoreScrollable)
                }
                break
            case 1:
                history.replaceState(
                    Object.assign(history.state, {
                        scrollX: scrollX,
                        scrollY: scrollY,
                        scrollables: getScrollables()
                    }),
                    0,
                    location.hash
                )
                popState = 2
                history.forward()
                break
            case 2:
                replace(createRequest('GET', location.hash.substring(1)))
                popState = 0
        }
    })

    function collectScrollables (element, scrollables, path) {
        var style = getComputedStyle(element)
        if (style.overflowX === 'auto'
            || style.overflowX === 'scroll'
            || style.overflowY === 'auto'
            || style.overflowY === 'scroll'
        ) {
            scrollables.push({
                path: path,
                scrollLeft: element.scrollLeft,
                scrollTop: element.scrollTop
            })
        }
        for (var i = 0; i < element.children.length; i++) {
            collectScrollables(element.children[i], scrollables, path.concat([i]))
        }
    }

    function getScrollables () {
        var scrollables = []
        collectScrollables(document.body, scrollables, [])
        return scrollables
    }

    function restoreScrollable (scrollable) {
        var element = document.body
        for (var i = 0; i < scrollable.path.length; i++) {
            if (scrollable.path[i] < element.children.length) {
                element = element.children[scrollable.path[i]]
            } else {
                return
            }
        }
        element.scrollLeft = scrollable.scrollLeft
        element.scrollTop = scrollable.scrollTop
    }
}
