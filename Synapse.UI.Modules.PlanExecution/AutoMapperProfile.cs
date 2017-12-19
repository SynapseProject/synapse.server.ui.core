using AutoMapper;
using Synapse.Core;
using ModularUI.Modules.PlanExecution.ViewModels;

namespace ModularUI.WebApplication
{
    public class AutoMapperProfile : Profile
    {
        public AutoMapperProfile()
        {
            CreateMap<Plan, PlanStatusVM>()
                    .ForMember(dest => dest.Status, m => m.MapFrom(src => src.Result.Status))
                    .ForMember(dest => dest.StatusText, m => m.MapFrom(src => src.Result.Status))
                    .ForMember(dest => dest.Actions, m => m.MapFrom(src => src.Actions));
            CreateMap<ActionItem, PlanStatusVM>()
                .ForMember(dest => dest.Status, m => m.MapFrom(src => src.Result.Status))
                .ForMember(dest => dest.StatusText, m => m.MapFrom(src => src.Result.Status))
                .ForMember(dest => dest.Actions, m => m.MapFrom(src => src.Actions))
                .ForMember(dest => dest.ActionGroup, m => m.MapFrom(src => src.ActionGroup));
        }
    }
}
