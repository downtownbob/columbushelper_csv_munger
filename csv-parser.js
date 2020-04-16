const fs  = require('fs');
const jp  = require('jsonpath');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const csvParser = require('csv-parse/lib/sync');
const dedupe = require('dedupe');


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
let rowId = 1;

const parseSmartColumbusJSON = (fileLocation) => {
    
    let sampleFile = JSON.parse(fs.readFileSync(fileLocation));
    let foodServiceNames = ["Food Banks/Food Distribution Warehouses", "Food Pantries", "Food Pantries * Veterans", "Soup Kitchens", "Community Meals", "Food Donation Programs", ]
    
    const getSite = (data) => {
        return jp.query(data, '$..site');
    }
    
    const getLatitude = (site) => {
        let [latitude, ] = jp.query(site, '$..latitude');
        return latitude;
    }
    
    const getlongitude = (site) => {
        let [longitude, ] = jp.query(site, '$..longitude');
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
        return (phoneNumbers.length > 0 ? phoneNumbers.join('\r\n') : phoneNumbers.join(''));
    }
    
    const getAddress = (site) => {
        let [city, ] = jp.query(site, '$..address..city')
        let [line1, ] = jp.query(site, '$..address..line1');
        let [line2, ] = jp.query(site, '$..address..line2');
        let [line3, ] = jp.query(site, '$..address..line3');
        let [state, ] = jp.query(site, '$..address..state');
        let [zip, ] = jp.query(site, '$..address..zip');
    
        // Nice spacing things.
        line1 = (line2 != '' ? line1 + ' ' : line1);
        line2 = (line3 != '' ? line2 + ' ' : line2);
    
        return line1 + line2 + line3 + ', ' + city + ' ' + state + ' ' + zip;
    }
    
    const getSiteInfo = (data) => {
        return jp.query(data, '$..site_info');
    }
    
    const getSiteInfoElement = (site_info, element_name) => {
        let [element, ] = jp.query(site_info, '$..detailtext[?(@.label=="' + element_name + '")].text');
        return element;
    }

    sampleFile.forEach(element => {
        let [category, ] = jp.query(element, '$..taxonomy.service_name');
        if (foodServiceNames.includes(category)) {
            let name = element.provider_name;
            let site = getSite(element);
            let siteInfo = getSiteInfo(element);
            let latitude = getLatitude(site);
            let longitude = getlongitude(site);
            let service_description = getSiteInfoElement(siteInfo, "Service Description");
            let hours = getSiteInfoElement(siteInfo, "Hours");
            let documents = getSiteInfoElement(siteInfo, "Documents");
            let eligibility = getSiteInfoElement(siteInfo, "Eligibility");
            let phone = getPhoneNumbers(site);
            let location = getAddress(site);
            
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
    
            rowId++;
        }
    });
}


const parseHscCsv = (fileLocation) => {
    const csv = fs.readFileSync(fileLocation);
    let parsedCSV = csvParser(csv, {
        columns: true,
        skip_empty_lines: true
      });

    parsedCSV.forEach(data => {
        rows.push(
            {
                id: rowId,
                category: null,
                name: data["Name"],
                documents: null,
                eligibility: null,
                hours: null,
                location: null,
                latitude: data["Latitude"],
                longitude: data["Longitude"],
                phone: null,
                service_description: data["Description"]
            }
        )
        rowId++;
    });
}

const parseCOVIDCsv = (fileLocation) => {
    const csv = fs.readFileSync(fileLocation);
    let parsedCSV = csvParser(csv, {
        columns: true,
        skip_empty_lines: true
      });

    parsedCSV.forEach(data => {
        rows.push(
            {
                id: rowId,
                category: data["Category"],
                name: data["Name"],
                documents: data["Documents"],
                eligibility: data["Eligibility"],
                hours: data["Hours"],
                location: data["Location"],
                latitude: data["Latitude"],
                longitude: data["Longitude"],
                phone: data["Phone"],
                service_description: data["Service Description"]
            }
        )
        rowId++;
    });
}

parseCOVIDCsv('./covid19_resources2.csv')

parseSmartColumbusJSON('./pantry.json');

parseHscCsv('./hsc.csv');

// Use a custom hash to look for exact duplicates and remove them - examine all fields but the id
console.log("before dedupe rows " + rows.length);
rows = dedupe(rows, value => [
    value.name,
    value.location,
    value.latitude,
    value.longitude,
    value.service_description,
    value.documents,
    value.hours,
    value.phone,
    value.eligibility,
    value.category
]);
console.log("after dedupe rows " + rows.length);


csvWriter.writeRecords(rows)
    .then(() => {
        console.log('File Written!');
    });
