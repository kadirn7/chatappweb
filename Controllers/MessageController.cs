using Microsoft.AspNetCore.Mvc;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using AutoMapper;
using Microsoft.Extensions.Logging;

namespace Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MessageController : ControllerBase
    {
        private readonly IMessageService _messageService;
        private readonly IMapper _mapper;
        private readonly ILogger<MessageController> _logger;

        public MessageController(IMessageService messageService, IMapper mapper, ILogger<MessageController> logger)
        {
            _messageService = messageService;
            _mapper = mapper;
            _logger = logger;
        }

        [HttpGet("GetMessageHistory")]
        public async Task<ReturnModel> GetMessageHistory([FromQuery] MessageHistoryModel messageHistoryModel)
        {
            try 
            {
                // Get messages from service
                var messages = await _messageService.GetMessageHistory(messageHistoryModel);
                
                // Map and mark sent messages
                var sentMessages = _mapper.Map<List<MessageModel>>(messages.Where(m => 
                    m.UserId.ToString() == messageHistoryModel.SenderUsername));
                sentMessages.ForEach(m => m.Type = "S");

                // Map and mark received messages 
                var receivedMessages = _mapper.Map<List<MessageModel>>(messages.Where(m =>
                    m.UserId.ToString() != messageHistoryModel.SenderUsername));
                receivedMessages.ForEach(m => m.Type = "R");

                // Combine and order messages
                var allMessages = sentMessages.Concat(receivedMessages)
                    .OrderBy(m => m.CreatedAt)
                    .ToList();

                return new ReturnModel
                {
                    Success = true,
                    Message = "Success",
                    StatusCode = 200,
                    Data = allMessages
                };
            }
            catch (Exception ex)
            {
                return new ReturnModel
                {
                    Success = false,
                    Message = ex.Message,
                    StatusCode = 400,
                    Data = null
                };
            }
        }
    }
} 