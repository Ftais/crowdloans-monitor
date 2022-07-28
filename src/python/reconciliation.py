import os
from read_data import readFile

relay_contribute = readFile.load_json(os.path.join('./dump_relay_data.json'))
para_contribute = readFile.load_json(os.path.join('./contributed.json'))

para_count = 0
for para_item in para_contribute:
    para_count += para_item['data'][0]
    # for relay_item in relay_contribute:
    #     if para_item['from'] == relay_item['account'] and para_item['data'][0] == relay_item['amount']:
    #         pass_count+=1
    #         relay_contribute.remove(relay_item)
    #         break

print(para_count, relay_contribute[0]['amount'], para_count-relay_contribute[0]['amount'])
# print(para_contribute)