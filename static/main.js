
$(document).ready(function(){
    
    $(document).on('click','#addemail',function(){
        var email = $.trim($('#newemail').val());
        console.log('addding...', email);
        if (!email) return;
        $('#newemail').val('');
        $.ajax({
            method:'POST',
            url:"/add",
            data:{email:email},
            datatype:'json',
            success:function(result){
                result = JSON.parse(result);
                console.log('got response back ', result);
                if (result.error) {
                    $('#emailerror').html(result.error);
                    return;
                }else $('#emailerror').html('');
                var d = '<div>'+
                        '<a href="mailto:'+result.email+'}">'+result.email+'</a>'+
                        '<span class="killemail">x</span>'+
                    '</div>';
                $('#emailpool').prepend(d)
            }
        });
    });

    $(document).on('click', '.killemail', function(){
        var node = $(this).parents('.emailnode');
        var email = $(this).siblings('a').html();
        console.log('got email ', email);
        if (!email) return;
        $.ajax({
            method:'POST',
            url:"/remove",
            data:{email:email},
            datatype:'json',
            success:function(result){
                result = JSON.parse(result);
                console.log('got response back ', result);
                if (result.error) {
                    $('#emailerror').html(result.error);
                    return;
                }else $('#emailerror').html('');
                console.log('removing '+result.email);
                node.remove();
            }
        });
    });
    var encode;
    try{
        encode = encodeURIComponent
    }catch(E){
        encode = encodeURI;
    }

    $('#refresh').click(function(){
        var frame = $('#preview').find('iframe');
        $.ajax({
            method:'POST',
            url:"/setpreview",
            data:{
                body:$('#body').val(),
                navbar:$('#navbar').val(),
                subject:$('#subject').val()
                },
            datatype:'json',
            success:function(result){
                var frame = $('#pcontainer').clone();
                $('#pcontainer').html('');
                $('#pcontainer').html(frame);
            }
        });
    });
    
    
    $('#send').click(function(){
        $.ajax({
            method:'POST',
            url:"/send",
            data:{
                body:$('#body').val(),
                navbar:$('#navbar').val(),
                subject:$('#subject').val(),
                testemail: $('#test').is(":checked") ? $('#testemail').val() : ''
                },
            datatype:'json',
            success:function(result){
                alert('Your email has been sent');
            }
        });
    });
    
});