const data = {
  activity_type: 'system',
  visibility_type: 'public',
  created_by: 'test-user2',
  created_by_name: 'Ulter Super Admin',
  message: 'Ticket Created by Ulter Super Admin',
  metadata_json: {
    priority: '1 - Critical',
    category: 'Software',
    assignmentGroup: 'Service Desk',
    status: 'New',
    shortDescription: 'Direct Interceptor Test'
  }
};

fetch('http://127.0.0.1:3001/api/tickets/q9HqCPIvka9he7T1XAol/activities', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data)
})
.then(res => res.json())
.then(json => console.log("API Response:", json))
.catch(err => console.error("Error:", err));
