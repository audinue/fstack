function Idb (name) {
    name = name || 'db'

    var db = Promise.resolve(null)

    function open () {
        return new Promise(function (resolve, reject) {
            var req = indexedDB.open(name)
            req.onerror = reject
            req.onblocked = reject
            req.onsuccess = function () {
                resolve(req.result)
            }
        })
    }

    function Collection (collection) {
        function createCollection (db) {
            return new Promise(function (resolve, reject) {
                db.close()
                var req = indexedDB.open(db.name, db.version + 1)
                req.onerror = reject
                req.onblocked = reject
                req.onupgradeneeded = function () {
                    req.result.createObjectStore(collection, {
                        keyPath: 'id'
                    })
                }
                req.onsuccess = function () {
                    resolve(req.result)
                }
            })
        }

        function query (db, callback) {
            return new Promise(function (resolve, reject) {
                var transaction = db.transaction(collection, 'readwrite')
                var req = callback(transaction.objectStore(collection))
                req.onerror = reject
                req.onblocked = reject
                transaction.oncomplete = function () {
                    resolve(req.result)
                }
            })
        }

        function execute (callback) {
            return new Promise(function (resolve, reject) {
                db = db
                    .then(function (db) {
                        if (db === null) {
                            return open()
                        } else {
                            return db
                        }
                    })
                    .then(function (db) {
                        if (db.objectStoreNames.contains(collection)) {
                            return db
                        } else {
                            return createCollection(db)
                        }
                    })
                    .then(function (db) {
                        return query(db, callback)
                            .then(function (result) {
                                resolve(result)
                                return db
                            })
                            .catch(function (error) {
                                reject(error)
                                return db
                            })
                    })
            })
        }

        return {
            count: function () {
                return execute(function (objectStore) {
                    return objectStore.count()
                })
            },
            get: function (id) {
                return execute(function (objectStore) {
                    return objectStore.get(id)
                })
            },
            getAll: function () {
                return execute(function (objectStore) {
                    return objectStore.getAll()
                })
            },
            add: function (document) {
                return execute(function (objectStore) {
                    return objectStore.add(
                        Object.assign(
                            {
                                id: crypto.randomUUID()
                            },
                            document
                        )
                    )
                })
            },
            put: function (document) {
                return execute(function (objectStore) {
                    return objectStore.put(document)
                })
            },
            delete: function (id) {
                return execute(function (objectStore) {
                    return objectStore.delete(id)
                })
            },
            clear: function () {
                return execute(function (objectStore) {
                    return objectStore.clear()
                })
            }
        }
    }

    return {
        collection: function (name) {
            return Collection(name)
        },
        delete: function () {
            return new Promise(function (resolve, reject) {
                var req = indexedDB.deleteDatabase('shop')
                req.onerror = reject
                req.onblocked = reject
                req.onsuccess = function () {
                    resolve()
                }
            })
        }
    }
}