if (process.env.NODE_ENV === 'development') {
  require('dotenv').config()
}
const Email = require('email-templates')
var aws = require('aws-sdk');
const pug = require('pug')

const s3 = new aws.S3({
  apiVersion : "2010-12-01",
  accessKeyId : process.env.AWS_S3_KEYID,
  secretAccessKey : process.env.AWS_S3_ACCESSKEY,
  region : process.env.AWS_S3_REGION
})

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

exports.handler = async(event) => {
  const params= parseJSON(event.body)
  const email = new Email({
    message: {
      from: params.from || 'hola@tutellus.com'
    },
    render: async (view, locals) => {
      if (view.endsWith('text')) return ''
      const template = await getS3File(params.bucket, `${view}.pug`);
      let html = pug.render(template, locals);
      return email.juiceResources(html);
    },
    // uncomment below to send emails in development/test env:
    // send: true,
    transport: {
      SES: new aws.SES({
        apiVersion : "2010-12-01",
        accessKeyId : process.env.AWS_SES_KEYID,
        secretAccessKey : process.env.AWS_SES_ACCESSKEY,
        region : process.env.AWS_SES_REGION
      })
    },
  })

  try {
    const result = await email.send({
      template: params.template || 'mars',
      message: {
        to: params.to || 'javieroc+sendEmail@gmail.com'
      },
      locals: params.locals || {name: 'sendEmail'}
    })
    result.body = parseJSON(event.body)
    return {
        statusCode: 200,
        body: JSON.stringify(result),
    }
  } catch (ex) {
      return {
          statusCode: 500,
          body: JSON.stringify({ error: ex.message }),
      }
  }
};