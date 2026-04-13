const params = new URLSearchParams();
params.append('leads[status][0][id]', '37708579');
params.append('leads[status][0][price]', '150000');
params.append('leads[status][0][name]', 'Test Uy');
params.append('leads[status][0][custom_fields][0][name]', 'Xonalar soni');
params.append('leads[status][0][custom_fields][0][values][0][value]', '4');
params.append('leads[status][0][custom_fields][1][name]', 'Qavat');
params.append('leads[status][0][custom_fields][1][values][0][value]', '2');

let rooms = null, area = null, floor = null, description = "Rieltorlar uchun maxsus yopiq mulk.";

const keys = Array.from(params.keys());
for (const [key, value] of params.entries()) {
  if (key.match(/leads\[.*\]\[custom_fields\]\[\d+\]\[name\]/)) {
     const nameVal = value.toLowerCase();
     const valueKey = key.replace('[name]', '[values][0][value]');
     const actualValue = params.get(valueKey);
     if (actualValue) {
         if (nameVal.includes('xona') || nameVal.includes('комнат')) {
             rooms = parseInt(actualValue.replace(/\D/g, ''));
         }
         if (nameVal.includes('qavat') || nameVal.includes('этаж') || nameVal.includes('floor')) {
             floor = parseInt(actualValue.replace(/\D/g, ''));
         }
     }
  }
}
console.log({ rooms, floor, description });
