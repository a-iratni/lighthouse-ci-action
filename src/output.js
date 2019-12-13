const { IncomingWebhook } = require('@slack/webhook')
const { readFileSync } = require('fs')

/**
 * @param {{type: string, status: number, slackWebhookUrl: string}} params
 */
async function run({ type, ...args }) {
  try {
    if (type === 'github') {
      // tbd
      // await githubCheck(args)
    } else if (type === 'slack') {
      await slackNotification(args)
    }
  } catch (e) {
    throw e
  }
}

/**
 * @param {{status: number, slackWebhookUrl: string}} params
 * @return {Promise<*>}
 */
async function slackNotification({ status, slackWebhookUrl }) {
  const conclusion = status === 0 ? 'success' : 'failure'
  const webhook = new IncomingWebhook(slackWebhookUrl)
  const color = status === 0 ? 'good' : 'danger'

  /** @type {Buffer} */
  const assertionResults = readFileSync(`${process.cwd()}/.lighthouseci/assertion-results.json`)
  const groupedResults = groupBy(JSON.parse(assertionResults.toString()), 'url')

  const attachments = Object.values(groupedResults).map(groupedResult => {
    const results = groupedResult.map(
      /**
       * @param {{auditId: string, auditProperty: string, auditTitle: string, expected: string, operator: string, actual: string, url: string}} res
       * @return {{title?: string, type: string, value: string, url: string}}
       */
      res => ({
        title: `${res.auditId}.${res.auditProperty}`,
        value: `${res.auditTitle} \n _Expected ${res.expected} ${
          res.operator === '<=' ? ' less then' : ' greater than'
        } actual ${res.actual}_`,
        type: 'mrkdwn',
        url: res.url
      })
    )

    const fields = results.slice(0, 2)
    fields.length > 0 &&
      fields.push({
        title: '...'
      })

    return {
      text: `${groupedResult.length + 1} result(s) for ${groupedResult[0].url}`,
      color,
      fields
    }
  })

  return webhook.send({
    attachments: [
      {
        pretext: 'GitHub Actions / LH Report',
        title: `Pull Request ${conclusion} - <https://github.com/treosh/lighthouse-ci-action/|View on GitHub>`,
        color
      },
      ...attachments,
      {
        title: `View Details`,
        title_link: 'https://github.com/paulirish/lighthouse-ci-action/pull/2/checks?check_run_id=310929699',
        color
      }
    ]
  })
}

/**
 *
 * @param {Array<any>} items
 * @param {String} key
 */
function groupBy(items, key) {
  return items.reduce(
    (result, item) => ({
      ...result,
      [item[key]]: [...(result[item[key]] || []), item]
    }),
    {}
  )
}

module.exports = {
  run
}