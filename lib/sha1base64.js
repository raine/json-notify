const crypto = require('crypto')

const sha1base64 = (text) =>
  crypto
    .createHash('sha1')
    .update(text)
    .digest('base64')

module.exports = sha1base64
