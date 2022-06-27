const PhalaClient = require('./phala');

(async () => {
    const phalaClient = await new PhalaClient().init();

    // sign file
    await phalaClient.newFile(1, (result) => {
        console.log(result);
    });

    // encrypt file
    await phalaClient.encryptFile(1, 'hello world', (result) => {
        console.log(result);
        // decrypt file
        await phalaClient.decryptFile(1, result, (result1) => {
            console.log(result1)
        });
    })

    // upload file link
    await phalaClient.updateLink(1, 'https://3analytics.io/file.1', (result) => { });

})();
