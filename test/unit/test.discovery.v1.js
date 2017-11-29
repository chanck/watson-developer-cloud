'use strict';

const assert = require('assert');
const DiscoveryV1 = require('../../discovery/v1');
const fs = require('fs');
const path = require('path');
const stream = require('stream');

const nock = require('nock');

describe('discovery-v1', function() {
  const noop = function() {};

  // Test params
  const service = {
    username: 'batman',
    password: 'bruce-wayne',
    url: 'http://ibm.com:80',
    version: 'v1',
    version_date: DiscoveryV1.VERSION_DATE_2017_08_01
  };

  const service_v2016_04_27 = {
    username: 'batman',
    password: 'bruce-wayne',
    url: 'http://ibm.com:80',
    version: 'v1',
    version_date: DiscoveryV1.VERSION_DATE_2017_04_27
  };

  const service_v2016_12_15 = {
    username: 'batman',
    password: 'bruce-wayne',
    url: 'http://ibm.com:80',
    version: 'v1',
    version_date: DiscoveryV1.VERSION_DATE_2016_12_15
  };

  const service_without_version_date = {
    password: 'bruce-wayne',
    url: 'http://ibm.com:80',
    version: 'v1',
    username: 'batman'
  };

  const paths = {
    environments: '/v1/environments',
    environmentinfo: '/v1/environments/env-guid',
    collections: '/v1/environments/env-guid/collections',
    collectioninfo: '/v1/environments/env-guid/collections/col-guid',
    configurations: '/v1/environments/env-guid/configurations',
    configurationinfo: '/v1/environments/env-guid/configurations/config-guid',
    delete_collection: '/v1/environments/env-guid/collections/col-guid',
    add_document: '/v1/environments/env-guid/collections/col-guid/documents',
    delete_document: '/v1/environments/env-guid/collections/col-guid/documents/document-guid',
    query: '/v1/environments/env-guid/collections/col-guid/query'
  };

  it('should generate version_date was not specified (negative test)', function() {
    function doThrowThing() {
      const discovery = new DiscoveryV1(service_without_version_date);
      assert(discovery);
    }
    assert.throws(doThrowThing, /version_date/);
  });

  describe('discovery versions', function() {
    [service, service_v2016_04_27, service_v2016_12_15].forEach(service => {
      beforeEach(function() {
        nock.disableNetConnect();
        // grr! these should be in the individual tests where they are needed!
        nock(service.url)
          .post(paths.environments + '?version=' + service.version_date)
          .reply(200, { environment_id: 'yes' })
          .get(paths.environmentinfo + '?version=' + service.version_date)
          .reply(200, { environment_id: 'info' })
          .put(paths.environmentinfo + '?version=' + service.version_date)
          .reply(200, { environment_id: 'yes' })
          .delete(paths.environmentinfo + '?version=' + service.version_date)
          .reply(200, { environment_id: 'info' })
          .get(paths.collections + '?version=' + service.version_date)
          .reply(200, { collection_id: 'yes' })
          .get(paths.collectioninfo + '?version=' + service.version_date)
          .reply(200, { collection_id: 'info' })
          .get(paths.query + '?version=' + service.version_date)
          .reply(200, { query: 'yes' })
          .post(paths.collections + '?version=' + service.version_date)
          .reply(200, { collection_id: 'yes' })
          .delete(paths.delete_collection + '?version=' + service.version_date)
          .reply(200, { config: 'yes' })
          .post(paths.add_document + '?version=' + service.version_date)
          .reply(200, { add_doc: 'yes' })
          .delete(paths.delete_document + '?version=' + service.version_date)
          .reply(200, { delete_doc: 'yes' })
          .get(paths.configurations + '?version=' + service.version_date)
          .reply(200, { configs: 'yes' });
      });

      afterEach(function() {
        nock.cleanAll();
      });

      const discovery = new DiscoveryV1(service);

      describe(`discovery(version_date=${service.version_date})`, function() {
        it('should generate a valid payload', function() {
          const req = discovery.getEnvironments({}, noop);
          assert.equal(req.uri.href, service.url + paths.environments + '?version=' + service.version_date);
          assert.equal(req.method, 'GET');
        });

        it('should create an environment', function() {
          const req = discovery.createEnvironment(
            {
              name: 'new environment',
              description: 'my description'
            },
            noop
          );
          assert.equal(req.method, 'POST');
        });

        it('should create an environment with size 1 by default', function() {
          const req = discovery.createEnvironment(
            {
              name: 'new environment',
              description: 'my description'
            },
            noop
          );
          const jsonBodyParts = readMultipartReqJsons(req);
          assert.equal(jsonBodyParts.length, 1);
          assert.equal(jsonBodyParts[0].size, 1);
        });

        it('should create an environment with size 0', function() {
          const req = discovery.createEnvironment(
            {
              name: 'new environment',
              description: 'my description',
              size: 0
            },
            noop
          );
          const jsonBodyParts = readMultipartReqJsons(req);
          assert.equal(jsonBodyParts.length, 1);
          assert.equal(jsonBodyParts[0].size, 0);
        });

        it('should update an environment', function() {
          const req = discovery.updateEnvironment(
            {
              environment_id: 'env-guid',
              name: 'my environment updated',
              description: 'my description updated'
            },
            noop
          );
          assert.equal(req.method, 'PUT');
        });

        it('should get an environment information', function() {
          const req = discovery.getEnvironment({ environment_id: 'env-guid' }, noop);
          assert.equal(req.uri.href, service.url + paths.environmentinfo + '?version=' + service.version_date);
          assert.equal(req.method, 'GET');
        });

        it('should delete an environment', function() {
          const req = discovery.deleteEnvironment({ environment_id: 'env-guid' }, noop);
          assert.equal(req.uri.href, service.url + paths.environmentinfo + '?version=' + service.version_date);
          assert.equal(req.method, 'DELETE');
        });

        it('should create a collection in an environment', function() {
          const req = discovery.createCollection(
            {
              environment_id: 'env-guid',
              configuration_id: 'config-guid',
              name: 'new collection',
              description: 'my description'
            },
            noop
          );
          assert.equal(req.uri.href, service.url + paths.collections + '?version=' + service.version_date);
          assert.equal(req.method, 'POST');
        });

        it('should get collections from an environment', function() {
          const req = discovery.getCollections({ environment_id: 'env-guid' }, noop);
          assert.equal(req.uri.href, service.url + paths.collections + '?version=' + service.version_date);
          assert.equal(req.method, 'GET');
        });

        it('should update collection in an environment', function() {
          const req = discovery.updateCollection(
            {
              environment_id: 'env-guid',
              collection_id: 'col-guid'
            },
            noop
          );
          assert.equal(req.uri.href, service.url + paths.collectioninfo + '?version=' + service.version_date);
          assert.equal(req.method, 'PUT');
        });

        it('should get information about a specific collections fields', function() {
          const req = discovery.getCollectionFields(
            {
              environment_id: 'env-guid',
              collection_id: 'col-guid'
            },
            noop
          );
          assert.equal(req.uri.href, service.url + paths.collectioninfo + '/fields' + '?version=' + service.version_date);
          assert.equal(req.method, 'GET');
        });

        it('should get information about a specific collection and environment', function() {
          const req = discovery.getCollection(
            {
              environment_id: 'env-guid',
              collection_id: 'col-guid'
            },
            noop
          );
          assert.equal(req.uri.href, service.url + paths.collectioninfo + '?version=' + service.version_date);
          assert.equal(req.method, 'GET');
        });

        it('should delete a collection in an environment', function() {
          const req = discovery.deleteCollection(
            {
              environment_id: 'env-guid',
              collection_id: 'col-guid'
            },
            noop
          );
          assert.equal(req.uri.href, service.url + paths.delete_collection + '?version=' + service.version_date);
          assert.equal(req.method, 'DELETE');
        });

        it('should get information about configurations in a specific environment', function() {
          const req = discovery.getConfigurations({ environment_id: 'env-guid' }, noop);
          assert.equal(req.uri.href, service.url + paths.configurations + '?version=' + service.version_date);
          assert.equal(req.method, 'GET');
        });

        it('should create a new configuration using a file', function() {
          const req = discovery.createConfiguration(
            {
              environment_id: 'env-guid',
              file: fs.createReadStream(path.join(__dirname, '../resources/discovery-sampleAddConf.json'))
            },
            noop
          );
          assert.equal(req.uri.href, service.url + paths.configurations + '?version=' + service.version_date);
          assert.equal(req.method, 'POST');
        });

        it('should update an existing configuration using a file', function() {
          const req = discovery.updateConfiguration(
            {
              environment_id: 'env-guid',
              configuration_id: 'config-guid',
              file: fs.createReadStream(path.join(__dirname, '../resources/discovery-sampleUpdateConf.json'))
            },
            noop
          );
          assert.equal(req.uri.href, service.url + paths.configurationinfo + '?version=' + service.version_date);
          assert.equal(req.method, 'PUT');
        });

        it('should get information about a specific configuration in a specific environment', function() {
          const req = discovery.getConfiguration({ environment_id: 'env-guid', configuration_id: 'config-guid' }, noop);
          assert.equal(req.uri.href, service.url + paths.configurationinfo + '?version=' + service.version_date);
          assert.equal(req.method, 'GET');
        });

        describe('addDocument()', function() {
          it('should add a document to a collection and environment', function() {
            const req = discovery.addDocument(
              {
                environment_id: 'env-guid',
                collection_id: 'col-guid',
                file: fs.createReadStream(path.join(__dirname, '../resources/sampleHtml.html'))
              },
              noop
            );
            assert.equal(req.uri.href, service.url + paths.add_document + '?version=' + service.version_date);
            assert.equal(req.method, 'POST');
          });

          // https://github.com/watson-developer-cloud/node-sdk/issues/474
          it('should accept an object for metadata', function(done) {
            nock.cleanAll();
            nock.disableNetConnect();
            const expectation = nock('http://ibm.com:80', { encodedQueryParams: true })
              .post('/v1/environments/env-guid/collections/col-guid/documents')
              .query({ version: service.version_date })
              .reply({
                status: 'processing',
                document_id: '45556e23-f2b1-449d-8f27-489b514000ff'
              });
            discovery.addDocument(
              {
                environment_id: 'env-guid',
                collection_id: 'col-guid',
                file: fs.createReadStream(path.join(__dirname, '../resources/sampleHtml.html')),
                metadata: { action: 'testing' }
              },
              function(err) {
                assert.ifError(err);
                expectation.isDone();
                done();
              }
            );
          });
        });

        it('should delete a document in a collection and environment', function() {
          const req = discovery.deleteDocument(
            {
              environment_id: 'env-guid',
              collection_id: 'col-guid',
              document_id: 'document-guid'
            },
            noop
          );
          assert.equal(req.uri.href, service.url + paths.delete_document + '?version=' + service.version_date);
          assert.equal(req.method, 'DELETE');
        });

        it('should perform a query', function() {
          const req = discovery.query(
            {
              environment_id: 'env-guid',
              collection_id: 'col-guid',
              filter: 'yesplease',
              count: 10,
              sort: '+field_1,-field_2',
              natural_language_query: 'a question about stuff and things',
              passages: true
            },
            noop
          );
          assert.equal(
            req.uri.href,
            service.url +
              paths.query +
              '?version=' +
              service.version_date +
              '&natural_language_query=a%20question%20about%20stuff%20and%20things&filter=yesplease&count=10&sort=%2Bfield_1%2C-field_2&passages=true'
          );
          assert.equal(req.method, 'GET');
        });

        /**
         * Return an array of parsed objects representing all valid JSON parts of a multipart request.
         * @param {*} req
         * @return {Array}
         */
        function readMultipartReqJsons(req) {
          const result = [];
          if (req && req.body && req.body.length) {
            req.body.forEach(part => {
              try {
                result.push(JSON.parse(Buffer.from(part).toString('ascii')));
              } catch (err) {
                // JSON parse error -> this part is not JSON: skip.
              }
            });
          }

          return result;
        }

        describe('_ensureFilename()', function() {
          it('should pass through ReadStreams unmodified', function() {
            const src = fs.createReadStream(path.join(__dirname, '../resources/sampleWord.docx'));
            assert.equal(DiscoveryV1._ensureFilename(src), src);
          });

          it('should pass through value/options objects with a filename', function() {
            const src = {
              value: 'foo',
              options: {
                filename: 'foo.bar'
              }
            };
            const actual = DiscoveryV1._ensureFilename(src);
            assert.equal(actual, src);
            assert.deepEqual(actual, {
              value: 'foo',
              options: {
                filename: 'foo.bar'
              }
            });
          });

          it('should create new object/values with a filename when missing', function() {
            const src = {
              value: '{"foo": "bar"}',
              options: {
                contentType: 'application/json'
              }
            };
            const actual = DiscoveryV1._ensureFilename(src);
            assert.deepEqual(actual, {
              value: '{"foo": "bar"}',
              options: {
                contentType: 'application/json',
                filename: '_'
              }
            });
            assert.notEqual(actual, src, 'it should be a new object, not a modification of the existing one');
          });

          it('should wrap buffers', function() {
            const src = Buffer.from([1, 2, 3, 4]);
            assert.deepEqual(DiscoveryV1._ensureFilename(src), {
              value: src,
              options: {
                filename: '_'
              }
            });
          });

          it('should wrap strings', function() {
            const src = 'foo';
            assert.deepEqual(DiscoveryV1._ensureFilename(src), {
              value: src,
              options: {
                filename: '_'
              }
            });
          });

          it('should wrap streams', function() {
            const src = new stream.Readable();
            assert.deepEqual(DiscoveryV1._ensureFilename(src), {
              value: src,
              options: {
                filename: '_'
              }
            });
          });
        }); // end of _ensureFilename()
      });
    });
  });
});
