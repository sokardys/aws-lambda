Promise.resolve(
    require('./index').handler({
        body: JSON.stringify(require('./locally-request.json'))
    })
)
.then(console.log)
.catch(console.error);