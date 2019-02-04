const fs = require('fs')

const mkdir = (path) => {
  try {
    fs.mkdirSync(path, {
      recursive: true
    })
  // eslint-disable-next-line no-empty
  } catch (err) {}
}

module.exports = mkdir
