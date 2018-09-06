var logging = require('firefly-logging').logging()
var logger = logging.getLogger('loopback-connector-jira')
//var errorHandler = require('../util/errorHandler.js')
var request = require('firefly-request-helper')
getIssueComment = function(filter, options, callback) {
    console.log("1")
    var commentResponse = [];
    var issueFilter = {};
    var token = {};
                issueFilter = filter || {}
    issueFilter.limit = filter.limit || 50
    issueFilter.where = filter.where || {}
    if (issueFilter && issueFilter.where && issueFilter.where.nextPageToken) {
        var decodedToken = Buffer.from(issueFilter.where.nextPageToken, 'base64').toString('ascii')
        token = JSON.parse(decodedToken)
                }else {
        token = {
            skipIssuestartAt: 0,
            skipIssueCommentStartAt: 0
        }
    }
    getAllComments(token, issueFilter.limit,commentResponse, options, callback)
}
exports.getIssueComment = getIssueComment;

function getIssue(token, options, callback) {
                
  var url="  http://10.53.19.174:8080/rest/api/2/search?startAt=" + token.skipIssuestartAt + "&maxResults=1" 
  var req = {
   method: 'GET',
   url: url,
   auth: { username: 'Admin', password: 'admin@123' },
   headers: {
      'Accept': 'application/json'
   }
};
console.log("3",JSON.stringify(req))
    request.callbackRequestHelper(req, function(err, response) {
        if (err) {
            err.status = 500
            err.description = 'Network call returned with an 500 error for GetContactFolders in Contact Collection'
            console.log(err);
            return err;
            //return errorHandler.throwError(err, ['RETRIEVEALL', 'calendarCollection'], options, callback)
        } else if (response.statusCode === 200) {
            console.log("4")
                                                var resp = JSON.parse(response.body).issues;
                                                //console.log("5",resp)
            callback(null, resp);

        } else {
            //hanlde access token refresh here
            console.log("Token expired")
        }
    })
}
//Function to get all the calendars for a calendar group
function crawlIssueComments(token, totalLimit, issueId, commentResponse, options, callback) {
                console.log("8",totalLimit)
    var newLimit = totalLimit - commentResponse.length;
    var url="http://10.53.19.174:8080/rest/api/2/issue/"+ issueId + "/comment?maxResults="+ newLimit
    var req = {
    method: 'GET',
    url: url,
    auth: { username: 'Admin', password: 'admin@123' },
    headers: { 
   'Accept': 'application/json',
  'Content-Type': 'application/json' 
   }
                };
    if (token.skipIssueCommentStartAt > 0) {
        req.url = req.url + "&startAt=" + token.skipIssueCommentStartAt;
    }          
                console.log("10",req)
    request.callbackRequestHelper(req, function(err, response) {
        if (err) {
            console.log("err", err)
            return err;
        } else if (response.statusCode == 200) {
            var comResp = JSON.parse(response.body).comments;
            if (comResp.length > 0) {
                    comResp.forEach(function(singlecomment) {
                    commentResponse.push(singlecomment);
                    token.skipIssueCommentStartAt++;
                });
                if (commentResponse.length < totalLimit) {
                    getAllComments(token, totalLimit, commentResponse, options, callback);
                } else {
                    callback(null, commentResponse, token);
                }
            } else {
                token.skipIssuestartAt++;
                token.skipIssueCommentStartAt = 0;
                getAllComments(token, totalLimit, commentResponse, options, callback);
            }
        } else {
                                                //console.log("11",response)
                                                console.log("I need to handle error here")
        }
    });
}

//Intermdiate function for recursive call
function getAllComments(token, totalLimit, commentResponse, options, callback) {
    console.log("2",token)
                if (token) {
        getIssue(token, options, function(err, data) {
            if (data.length > 0) {
                var issueId = data[0].id;
                 console.log("6",issueId)
                if (err) {
                    console.log(err);
                    return err;
                } else {
                    crawlIssueComments(token, totalLimit, issueId, commentResponse, options, function(err, data, token) {
                        if (commentResponse.length < totalLimit) {
                                                                                                                //recursive call
                            getAllComments(token, totalLimit, commentResponse, options, callback);
                        } else {
                            if (commentResponse.length && token !== undefined) {
                                                                                                                                //Need to base 64 encode token before setting it in response.
                                                                                                                                token = Buffer.from(JSON.stringify(token)).toString('base64');
                                commentResponse[commentResponse.length - 1].nextPageToken = token;
                                                                                                                                callback(null, commentResponse);
                            } else {
                                                                                                                                callback(null, commentResponse);
                                                                                                                }
                        }
                    });
                }
                                                // no more records in calendar group
            } else {
                callback(null, commentResponse);
            }
        });
                //All the calendar groups are process, nothing in token now
    } else {
        callback(null, commentResponse);
    }
}
//setting filter
var filter = {};
filter.limit = 3;
filter.where={};
filter.where.nextPageToken='eyJza2lwSXNzdWVzdGFydEF0IjozLCJza2lwSXNzdWVDb21tZW50U3RhcnRBdCI6Mn0=';
var options = {};
getIssueComment(filter, options, function(err, data) {
    console.log("Error is :::", err)
    console.log("Data is ::::", data)
                console.log("Data is ::::", data.length)
});
