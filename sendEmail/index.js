if (process.env.NODE_ENV === 'development') {
  require('dotenv').config()
}
const assert = require('assert')
const Email = require('email-templates')
var aws = require('aws-sdk');
const pug = require('pug')

const configSES = {
  apiVersion : "2010-12-01",
  accessKeyId : process.env.AWS_SES_KEYID,
  secretAccessKey : process.env.AWS_SES_ACCESSKEY,
  region : process.env.AWS_SES_REGION
}

const configS3 = {
  apiVersion : "2010-12-01",
  accessKeyId : process.env.AWS_S3_KEYID,
  secretAccessKey : process.env.AWS_S3_ACCESSKEY,
  region : process.env.AWS_S3_REGION
}

const log = (...params) => {
  const fName = process.env.AWS_LAMBDA_FUNCTION_NAME || 'locally'
  const fVersion = process.env.AWS_LAMBDA_FUNCTION_VERSION || 'dev'

  const args = [`[${fName}@${fVersion}]`, ...params]
  console.log.apply(null, args)
}

log('- SES config:', configSES)
log('- S3 config:', configS3)

const s3 = new aws.S3(configS3)

const getS3File = async (bucket = process.env.AWS_S3_DEFAULT_BUCKET, path) => {
  return new Promise((resolve, reject) => {
    var getParams = {
      Bucket: bucket,
      Key:  path
    }

    s3.getObject(getParams, function(err, data) {
      if (err) {
        return reject(err)
      }

      resolve(data.Body.toString('utf-8'))
    });
  });
}

const parseJSON = (info = {}) => {
  if (!info) info = {}
  try{
    return JSON.parse(info)
  }catch (ex){
    return {}
  }
}

const checkRequiredParams = params => {
  assert(params.from, 'The source account of the email is missing [from]')
  assert(params.to, 'The destination account of the email is missing [to]')
  assert(params.template, 'The template of the email to use is missing [template]')
}

exports.handler = async(event) => {
  const params = parseJSON(event.body)
  log('- body', params);
  try {
    checkRequiredParams(params)
    const email = new Email({
      message: {
        from: params.from
      },
      render: async (view, locals) => {
        if (view.endsWith('text')) return ''
        const template = await getS3File(params.bucket, `${view}.pug`);
        let html = pug.render(template, locals);
        return email.juiceResources(html);
      },
      // uncomment below to send emails in development/test env:
      //send: true,
      transport: {
        SES: new aws.SES(configSES)
      },
    })

    const result = await email.send({
      template: params.template || 'mars',
      message: {
        to: params.to,
        cc: params.cc,
        bcc: params.bcc
      },
      locals: params.locals || {}
    })
    return {
        statusCode: 200,
        body: JSON.stringify({
          messageId: result.messageId,
          originalMessage: result.originalMessage,
        }),
    }
  } catch (ex) {
      return {
          statusCode: 500,
          body: JSON.stringify({ error: ex.message }),
      }
  }
};