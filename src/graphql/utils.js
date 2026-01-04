import { readdir, readFile } from 'fs'

export const getDir = (path = __dirname, errorMessage = ["error"]) => new Promise((resolve, reject) => {
    readdir(path, (err, content) => {
        if (err) {
            console.log(...errorMessage)

            reject(err);
        } else resolve(content)
    })
});

export const getFileContent = (path = __dirname, errorMessage = ["error"]) => new Promise((resolve, reject) => {
    readFile(path, (err, content) => {
        if (err) {
            console.log(...errorMessage)

            reject(err);
        } else resolve(content)
    })
});