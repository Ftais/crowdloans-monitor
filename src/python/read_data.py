import yaml
import json
import pandas as pd

class ReadFileData():

    def __init__(self):
        pass

    def load_yaml(self, file_path):
        with open(file_path, encoding='utf-8') as f:
            data = yaml.safe_load(f)
        return data

    def load_json(self, file_path):
        with open(file_path, encoding='utf-8') as f:
            data = json.load(f)
        return data

    def load_excel(self, file_path):
        # 读取excel 并且去除全为空数据的行 并且 去重 保留第一次出现的行
        data = pd.read_excel(file_path).dropna(how='all').drop_duplicates(keep='first')
        return data.to_dict("records")

    def load_csv(self, file_path, sep=None, header=None):
        """
        读取TXT或CSV文件
        :param file_path: 文件路径
        :param sep: 分隔符
        :param header: 标题行索引
        :return: 有标题为字典 无标题为列表
        """
        data = pd.read_csv(file_path, sep=sep, header=header, encoding='utf-8', engine='python')
        if header is not None:
            return data.to_dict("records")
        else:
            return data.values.tolist()

readFile = ReadFileData()
