#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class TecnoDiasAPITester:
    def __init__(self, base_url="https://smartquote-app-2.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=headers)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=headers)

            success = response.status_code == expected_status
            
            if success:
                self.tests_passed += 1
                print(f"✅ PASSED - Status: {response.status_code}")
                try:
                    response_data = response.json()
                    return True, response_data
                except:
                    return True, {}
            else:
                print(f"❌ FAILED - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                self.failed_tests.append({
                    'test': name,
                    'expected': expected_status,
                    'actual': response.status_code,
                    'response': response.text[:200]
                })
                return False, {}

        except Exception as e:
            print(f"❌ FAILED - Error: {str(e)}")
            self.failed_tests.append({
                'test': name,
                'error': str(e)
            })
            return False, {}

    def test_login(self):
        """Test login and get token"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": "tecnodias25@outlook.com", "password": "t3cnica@"},
            auth_required=False
        )
        
        if success and 'access_token' in response:
            self.token = response['access_token']
            print(f"   Token obtained: {self.token[:20]}...")
            
            # Test get current user
            self.run_test(
                "Get Current User",
                "GET", 
                "auth/me",
                200
            )
            return True
        return False

    def test_items_crud(self):
        """Test Items CRUD operations"""
        print("\n" + "="*50)
        print("TESTING ITEMS CRUD")
        print("="*50)
        
        # Get all items
        success, items_data = self.run_test(
            "Get All Items",
            "GET",
            "items",
            200
        )
        
        if success:
            print(f"   Found {len(items_data)} items")
        
        # Create new item
        new_item_data = {
            "nome": "Test Item - Automated Test",
            "preco_real": 50.00,
            "preco_venda": 100.00,
            "desconto_maximo": 15.0,
            "categoria": "material"
        }
        
        success, created_item = self.run_test(
            "Create New Item",
            "POST",
            "items",
            200,
            data=new_item_data
        )
        
        item_id = None
        if success and 'id' in created_item:
            item_id = created_item['id']
            print(f"   Created item ID: {item_id}")
            
            # Update the item
            update_data = {
                "nome": "Test Item - Updated",
                "preco_venda": 120.00
            }
            
            self.run_test(
                "Update Item",
                "PUT",
                f"items/{item_id}",
                200,
                data=update_data
            )
            
            # Delete the item
            self.run_test(
                "Delete Item",
                "DELETE",
                f"items/{item_id}",
                200
            )
        
        return item_id is not None

    def test_orcamentos_crud(self):
        """Test Orçamentos CRUD operations"""
        print("\n" + "="*50)
        print("TESTING ORÇAMENTOS CRUD")
        print("="*50)
        
        # Get all orçamentos
        success, orcamentos_data = self.run_test(
            "Get All Orçamentos",
            "GET",
            "orcamentos",
            200
        )
        
        if success:
            print(f"   Found {len(orcamentos_data)} orçamentos")
        
        # Get items for creating orçamento
        success, items_data = self.run_test(
            "Get Items for Orçamento",
            "GET",
            "items",
            200
        )
        
        if success and len(items_data) > 0:
            # Create new orçamento
            first_item = items_data[0]
            new_orcamento_data = {
                "cliente": {
                    "nome": "Cliente Teste Automatizado",
                    "endereco": "Rua Teste, 123 - São Carlos/SP",
                    "contato": "(16) 99999-9999"
                },
                "items": [{
                    "item_id": first_item['id'],
                    "nome": first_item['nome'],
                    "quantidade": 2,
                    "preco_unitario": first_item['preco_venda'],
                    "total_item": 2 * first_item['preco_venda']
                }],
                "desconto_aplicado": 0.0,
                "observacoes": "Orçamento criado por teste automatizado"
            }
            
            success, created_orc = self.run_test(
                "Create New Orçamento",
                "POST",
                "orcamentos",
                200,
                data=new_orcamento_data
            )
            
            orc_id = None
            if success and 'id_orcamento' in created_orc:
                orc_id = created_orc['id_orcamento']
                print(f"   Created orçamento ID: {orc_id}")
                
                # Get specific orçamento
                self.run_test(
                    "Get Specific Orçamento",
                    "GET",
                    f"orcamentos/{orc_id}",
                    200
                )
                
                # Update orçamento status
                self.run_test(
                    "Update Orçamento Status",
                    "PATCH",
                    f"orcamentos/{orc_id}/status",
                    200,
                    data={"status": "Aprovado"}
                )
                
                # Test PDF generation
                self.run_test(
                    "Generate PDF",
                    "GET",
                    f"orcamentos/{orc_id}/pdf",
                    200
                )
            
            return orc_id is not None
        
        return False

    def test_dashboard(self):
        """Test Dashboard endpoints"""
        print("\n" + "="*50)
        print("TESTING DASHBOARD")
        print("="*50)
        
        # Get dashboard stats
        success, stats_data = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        if success:
            print(f"   Stats: {json.dumps(stats_data, indent=2)}")
        
        # Get dashboard charts
        success, charts_data = self.run_test(
            "Get Dashboard Charts",
            "GET",
            "dashboard/charts",
            200
        )
        
        if success:
            print(f"   Charts data loaded successfully")
        
        return True

    def test_margin_calculation(self):
        """Test margin calculation and alerts"""
        print("\n" + "="*50)
        print("TESTING MARGIN CALCULATION")
        print("="*50)
        
        # Create item with low margin
        low_margin_item = {
            "nome": "Low Margin Test Item",
            "preco_real": 90.00,
            "preco_venda": 100.00,  # Only 10% margin
            "desconto_maximo": 5.0,
            "categoria": "material"
        }
        
        success, created_item = self.run_test(
            "Create Low Margin Item",
            "POST",
            "items",
            200,
            data=low_margin_item
        )
        
        if success and 'margem' in created_item:
            margin = created_item['margem']
            print(f"   Calculated margin: {margin}%")
            
            if margin < 20:
                print("✅ Low margin detected correctly")
            else:
                print("❌ Margin calculation may be incorrect")
            
            # Clean up
            if 'id' in created_item:
                self.run_test(
                    "Delete Low Margin Item",
                    "DELETE",
                    f"items/{created_item['id']}",
                    200
                )
        
        return True

    def print_summary(self):
        """Print test summary"""
        print("\n" + "="*60)
        print("TEST SUMMARY")
        print("="*60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {len(self.failed_tests)}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")
        
        if self.failed_tests:
            print("\n❌ FAILED TESTS:")
            for i, test in enumerate(self.failed_tests, 1):
                print(f"{i}. {test['test']}")
                if 'error' in test:
                    print(f"   Error: {test['error']}")
                else:
                    print(f"   Expected: {test['expected']}, Got: {test['actual']}")
                    print(f"   Response: {test['response']}")
        
        return len(self.failed_tests) == 0

def main():
    print("🚀 Starting TECNO DIAS Backend API Tests")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = TecnoDiasAPITester()
    
    # Run all tests
    login_success = tester.test_login()
    if not login_success:
        print("❌ Login failed, stopping tests")
        tester.print_summary()
        return 1
    
    tester.test_items_crud()
    tester.test_orcamentos_crud()
    tester.test_dashboard()
    tester.test_margin_calculation()
    
    # Print final summary
    success = tester.print_summary()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())