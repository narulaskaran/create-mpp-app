const healthState = document.querySelector('#health-state')
const curlExample = document.querySelector('#curl-example')

const origin = window.location.origin

if (curlExample) {
  curlExample.textContent = `curl --request POST \\
  --url ${origin}/api/provision \\
  --header 'content-type: application/json' \\
  --data '{
    "projectName": "my-api",
    "name": "Demo Developer",
    "email": "demo@example.com",
    "chainType": "ethereum"
  }'`
}

if (healthState) {
  fetch('/api/health')
    .then((response) => response.json())
    .then((payload) => {
      if (payload.provisioningConfigured) {
        healthState.textContent = 'Configured'
        healthState.dataset.state = 'configured'
        return
      }

      healthState.textContent = 'Missing env vars'
      healthState.dataset.state = 'not-configured'
    })
    .catch(() => {
      healthState.textContent = 'Unavailable'
      healthState.dataset.state = 'not-configured'
    })
}
