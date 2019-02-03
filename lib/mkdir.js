const fs = require('fs')

const mkdir = (path) => {
  try {
    fs.mkdirSync(path, {
      recursive: true
    })
  } catch (err) {}
}

module.exports = mkdir
