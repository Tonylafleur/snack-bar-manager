module.exports = async (req, res) => {
  const { default: app } = await import('../backend/dist/server.js')
  return app(req, res)
}
