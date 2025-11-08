import requests
import os
import time
from datetime import datetime, timedelta

class AdvancedTwitterScraper:
    def __init__(self):
        self.base_url = "https://twitter.com/i/search/timeline"
        self.downloaded_count = 0
        self.target_count = 500
        
    def construct_search_url(self, query, max_position=None):
        """Tạo URL search Twitter advanced"""
        params = {
            'f': 'tweets',
            'vertical': 'default',
            'q': query,
            'src': 'typd',
            'include_available_features': 1,
            'include_entities': 1
        }
        
        if max_position:
            params['max_position'] = max_position
            
        return params
    
    def scrape_twitter_advanced(self):
        """Scrape sử dụng Twitter advanced search patterns"""
        
        # Các query tìm kiếm được tối ưu
        search_queries = [
            '"monad" filter:images -filter:retweets',
            '"monad blockchain" filter:images',
            '#monad filter:images',
            'monad (awesome OR amazing OR great OR good) filter:images',
            'monad (love OR happy OR excellent) filter:images',
        ]
        
        for query in search_queries:
            if self.downloaded_count >= self.target_count:
                break
                
            print(f"Searching: {query}")
            self.scrape_query(query)
    
    def scrape_query(self, query, max_position=None):
        """Scrape một query cụ thể"""
        try:
            # Sử dụng requests để lấy HTML
            search_url = "https://twitter.com/search"
            params = {
                'q': query,
                'f': 'live',
                'vertical': 'default',
                'src': 'typd'
            }
            
            response = requests.get(search_url, params=params)
            
            # Phân tích HTML để tìm ảnh
            # (Cần phân tích cấu trúc HTML của Twitter)
            
        except Exception as e:
            print(f"Error: {e}")