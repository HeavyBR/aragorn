var fs = require('fs');
var parse = require('csv-parse');

const brazilCodeArea = '55'
const preDefinedKeys = ['fullname', 'eid']
const booleanKeys = ['invisible', 'see_all']
const csvData = []


fs.createReadStream('test.csv')
    .pipe(parse())
    .on('data', function (csvrow) {
        csvData.push(csvrow);
    })
    .on('end', function () {
        const headers = csvData[0]
        const entries = csvData.slice(1)

        const data = entries.map((value) => {
            let entry = {}
            // Parse csv itens to a object
            headers.forEach((key, index) => {
                if (entry[key]) {
                    entry = { ...entry, [key]: entry[key].concat(',', value[index]) }
                    return
                }
                entry = { ...entry, [key]: value[index] }
            })
            return entry
        }).map((item) => {
            let obj = {}

            Object.entries(item).forEach(([key, value]) => {
                if (hasWhiteSpace(key)) {
                    let values = key.split(' ')
                    const type = values[0]
                    values = values.slice(1)
                    obj = addAddress(type, values, value, obj)
                } else {
                    if (preDefinedKeys.includes(key)) {
                        obj = { ...obj, [key]: value }
                    } else if (booleanKeys.includes(key)) {
                        if (value === 'yes' || value === '1') {
                            obj = { ...obj, [key]: true }
                        } else {
                            obj = { ...obj, [key]: false }
                        }
                    } else if (key === 'group') {
                        if (value == '') {
                            obj = { ...obj, groups: [] }
                        }
                        groups = value.replace(/[\/,]/g, ",").split(',').map((val) => val.trim()).filter((val) => val)
                        obj = { ...obj, groups: [...(obj[key] || []), ...groups] }
                    }
                }
            })

            return obj
        })

        const objects_by_eid = groupBy(data, 'eid')
        const final_data = Object.entries(objects_by_eid).map(([key, value]) => {
            return value.reduce((acc, cur) => {
                acc.addresses = [...acc.addresses, ...cur.addresses]
                acc.groups = [...(acc.groups || []), ...cur.groups].filter(unique)
                acc.invisible = cur.invisible || acc.invisible
                acc.see_all = cur.see_all || acc.see_all
                acc.eid = cur.eid || acc.eid
                acc.fullname = cur.fullname || acc.fullname

                return acc
            })
        })

        fs.writeFile('output.json', JSON.stringify(final_data), (err) => {
            if (err) {
                throw err;
            }
            console.log("JSON data is saved.");
        });
    });


const groupBy = (items, key) => items.reduce(
    (result, item) => ({
        ...result,
        [item[key]]: [
            ...(result[item[key]] || []),
            item,
        ],
    }),
    {},
);

function addAddress(type, values, val, obj) {
    const new_address = handleAddress(val)

    if (new_address != null) {
        let addresses_to_add = []
        if (Array.isArray(new_address)) {
            addresses_to_add = new_address.map((email) => {
                return {
                    type: type,
                    tags: values.map((val) => val.trim()),
                    address: email
                }
            })
        } else {
            addresses_to_add = [{
                type: type,
                tags: values.map((val) => val.trim()),
                address: new_address
            }]
        }
        return {
            ...obj,
            addresses: [
                ...obj['addresses'] || [],
                ...addresses_to_add
            ]
        }
    }


    return obj
}


function handleAddress(address) {
    if (extractEmails(address) != null) {
        return extractEmails(address)
    } else {
        return extractPhone(address)
    }
}

function hasWhiteSpace(s) {
    return /\s/g.test(s);
}

function unique(value, index, self) {
    return self.indexOf(value) === index;
}

function extractPhone(phone) {
    var digits = phone.replace(/\D/g, '')
    if (digits.length === 11) {
        return digits.substring(0, 2) === brazilCodeArea ? digits : brazilCodeArea + digits
    }

    return null
}

function extractEmails(text) {
    return text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi);
}
