using System;
using Newtonsoft.Json;

namespace Synapse.UI.Modules.PlanExecution.Helpers
{
    //https://gist.github.com/Bouke/aa00f3952e9690223f51
    public class LongStringConverter : JsonConverter
    {
        public override bool CanRead
        {
            get { return false; }
        }
        public override bool CanConvert(Type objectType)
        {
            if (objectType == typeof(long) || objectType == typeof(long?))
            {
                return true;
            }
            return false;
        }
        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            throw new NotImplementedException();
        }
        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            writer.WriteValue(((long)value).ToString());
        }
    }
}
