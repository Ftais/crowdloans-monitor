import os
import csv
import pandas as pd
from read_data import readFile

def export_excel(data, header, file_path):
    # 将字典列表转换为DataFrame
    pf = pd.DataFrame(list(data))
    # 指定字段顺序
    pf = pf[header]

    # 指定生成的Excel表格名称
    file_path = pd.ExcelWriter(file_path)
    # 输出
    pf.to_excel(file_path, encoding='utf-8', index=False)
    # 保存表格
    file_path.save()
    return True

def export_csv(data, header, file_path, _type):
    if _type == 'json':
        with open(file_path, 'w', newline='') as csv_file:
            csv_file = csv.DictWriter(csv_file, fieldnames=header)
            csv_file.writeheader()  
            csv_file.writerows(data)     
    # with open('file_path', 'w', newline='') as csv_file:
    #     w = csv.writer(csv_file)
    #     # 写入列头
    #     w.writerow(header)
    #     for item in data:
    #         w.writerow(item)

data = readFile.load_json(os.path.join('./dump_data.json'))
header = ['account', 'amount', 'referralCode']
export_csv(data, header, './dump_data.csv', 'json')