const fs = require('fs');

class JsonDb {

    json = 'db.json';
    sep = 4;

    constructor(json) {
        if (json)
            this.json = json;
        try {
            const tData = JSON.parse(fs.readFileSync(this.json));
            if (Object.keys(tData) && Object.keys(tData).length === 0)
                fs.writeFileSync(this.json, JSON.stringify({}, null, this.sep));
        } catch (err) {
            fs.writeFileSync(this.json, JSON.stringify({}, null, this.sep));
        }
    }

    set(key, data) {
        const tData = JSON.parse(fs.readFileSync(this.json));
        tData[key] = data;
        fs.writeFileSync(this.json, JSON.stringify(tData, null, this.sep));
    }

    get(key) {
        return JSON.parse(fs.readFileSync(this.json))[key];
    }

    delete(key) {
        const tData = JSON.parse(fs.readFileSync(this.json));
        delete tData[key];
        fs.writeFileSync(this.json, JSON.stringify(tData, null, this.sep));
    }

}

module.exports = JsonDb;
