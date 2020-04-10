var fs  = require('fs');
var jp  = require('jsonpath');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

// var cities = [
//     { name: "London", "population": 8615246 },
//     { name: "Berlin", "population": 3517424 },
//     { name: "Madrid", "population": 3165235 },
//     { name: "Rome",   "population": 2870528 }
//   ];
  
// var names = jp.query(cities, '$..name');

// console.log(names);

let csvColumnHeaders = [
    'ID',
    'Category',
    'Name',
    'Documents',
    'Eligibility',
    'Hours',
    'Location',
    'Latitude',
    'Longitude',
    'Phone',
    'Service Description'
]

const csvWriter = createCsvWriter({
    path: './test_file.csv',
    header: [
        {id: 'id', title: 'ID'},
        {id: 'category', title: 'Category'},
        {id: 'name', title: 'Name'},
        {id: 'documents', title: 'Documents'},
        {id: 'eligibility', title: 'Eligibility'},
        {id: 'hours', title: 'Hours'},
        {id: 'location', title: 'Location'},
        {id: 'latitude', title: 'Latitude'},
        {id: 'longitude', title: 'Longitude'},
        {id: 'phone', title: 'Phone'},
        {id: 'service_description', title: 'Service Description'},
    ]
});

let rows = [];

let sampleFile = JSON.parse(fs.readFileSync('./pantry.json'));

let foodServiceNames = ["Food Banks/Food Distribution Warehouses", "Food Pantries", "Food Pantries * Veterans", "Soup Kitchens"]
var rowId = 1;

const getSite = (data) => {
    return jp.query(data, '$..site');
}

const getLatitude = (site) => {
    var [latitude, ] = jp.query(site, '$..latitude');
    return latitude;
}

const getlongitude = (site) => {
    var [longitude, ] = jp.query(site, '$..longitude');
    return longitude;
}

const getPhoneNumbers = (site) => {
    let phoneNumbers = [];
    let stgphones = jp.query(site, '$..stgphones..phone');
    let stphone = jp.query(site, '$..stphones..phone');
    if (stgphones != []) {
        phoneNumbers.push(...stgphones);
    }
    if (stphone != []) {
        phoneNumbers.push(...stphone);
    }
    if (phoneNumbers.length > 0 ) {
        phoneNumbers.join('/r/n');
    } 
    return (phoneNumbers.length > 0 ? phoneNumbers.join('\r\n') : phoneNumbers.join(''));
}

const getAddress = (site) => {
    var [city, ] = jp.query(site, '$..address..city')
    var [line1, ] = jp.query(site, '$..address..line1');
    var [line2, ] = jp.query(site, '$..address..line2');
    var [line3, ] = jp.query(site, '$..address..line3');
    var [state, ] = jp.query(site, '$..address..state');
    var [zip, ] = jp.query(site, '$..address..zip');

    // Nice spacing things.
    line1 = (line2 != '' ? line1 + ' ' : line1);
    line2 = (line3 != '' ? line2 + ' ' : line2);

    return line1 + line2 + line3 + ', ' + city + ' ' + state + ' ' + zip;
}

const getSiteInfo = (data) => {
    return jp.query(data, '$..site_info');
}

const getServiceDescription = (site_info) => {
    var [site_description, ] = jp.query(site_info, '$..detailtext[?(@.label=="Service Description")].text');
    return site_description;
}

const getHours = (site_info) => {
    var [hours, ] = jp.query(site_info, '$..detailtext[?(@.label=="Hours")].text');
    return hours;
}

const getDocuments = (site_info) => {
    var [documents, ] = jp.query(site_info, '$..detailtext[?(@.label=="Documents")].text');
    return documents;
}

const getEligibility = (site_info) => {
    var [eligibility, ] = jp.query(site_info, '$..detailtext[?(@.label=="Eligibility")].text');
    return eligibility;
}

sampleFile.forEach(element => {
    var [category, ] = jp.query(element, '$..taxonomy.service_name');
    if (foodServiceNames.includes(category)) {
        var name = element.provider_name;
        var site = getSite(element);
        var siteInfo = getSiteInfo(element);
        var latitude = getLatitude(site);
        var longitude = getlongitude(site);
        var service_description = getServiceDescription(siteInfo);
        var hours = getHours(siteInfo);
        var documents = getDocuments(siteInfo);
        var eligibility = getEligibility(siteInfo);
        var phone = getPhoneNumbers(site);
        var location = getAddress(site);
        
        rows.push(
            {
                id: rowId,
                category: category,
                name: name,
                documents: documents,
                eligibility: eligibility,
                hours: hours,
                location: location,
                latitude: latitude,
                longitude: longitude,
                phone: phone,
                service_description: service_description
            }
        );

        console.log(name);
        console.log(category);
        console.log(latitude);
        console.log(longitude);
        // console.log(siteInfo);
        console.log(service_description);
        console.log(hours);
        console.log(documents);
        console.log(eligibility);
        console.log(phone);
        console.log(location);
        rowId++;
    }
});
console.log(rowId);
csvWriter.writeRecords(rows)       // returns a promise
    .then(() => {
        console.log('File Written!');
    });

/* 

Look into pulling services as sometimes the phone number might be buried within, ala:

"services": [{
        "email": "",
        "filters": "",
        "id": "87774",
        "name": "Food Pantries",
        "note1": "Call ahead for pick up (614)638-3963",
        "note2": "",
        "phones": [{
          "phone": "(614) 638-3963 Program Number Call ahead for pick up",
          "type": "ss"
        }],
        "refer": "1",
        "url": ""
      }],

*/