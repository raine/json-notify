const fs = require('fs')

const mkdir = (path) => {
  try {
    fs.mkdirSync(path)
  } catch (err) {}
}

module.exports = mkdir
