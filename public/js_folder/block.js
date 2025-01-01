
                               
const buttons=document.querySelectorAll('.block-btn');
buttons.forEach(button=>{
    button.addEventListener('click',async()=>{
        const userId=button.getAttribute('data-id');
        const action=button.getAttribute('data-action')
        try{
        const response=await fetch('/admin/blockCustomer',{
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body:JSON.stringify({id:userId,action})
        })
        const result=await response.json();
        if(response.ok){
            if(action==='block'){
                button.textContent='unblock';
                button.classList.remove('btn-danger');
                button.classList.add('btn-success');
                button.setAttribute('data-action','unblock')
                
            }else{
                button.textContent='BLOCK';
                button.classList.remove('btn-success')
                button.classList.add('btn-danger');
                button.setAttribute('data-action','block')
            }
            
        }else{
            console.log(result.message);
        }
        }
        catch(error){
            console.log(error);
            alert('something went wrong')
        }
    })
})
