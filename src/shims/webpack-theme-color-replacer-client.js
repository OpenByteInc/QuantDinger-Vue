const noop = () => {}
const client = {
  varyColor: {
    lighten: (color) => color,
    toNum3: () => [0, 0, 0]
  },
  changer: {
    changeColor: () => Promise.resolve()
  }
}
export default client
export { client, noop }
