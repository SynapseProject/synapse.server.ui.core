using System;
using System.Collections.Generic;
using Synapse.Core;

namespace Synapse.UI.Modules.PlanExecution.ViewModels
{
    public class DynamicParameterVM : IEquatable<DynamicParameterVM>
    {
        public int Id { get; set; }
        public int? ParentId { get; set; }
        public string ActionName { get; set; }
        public bool IsActionGroup { get; set; }
        public string Source { get; set; }
        public bool Editable { get; set; }
        public string DataType { get; set; }
        public string Validation { get; set; }
        public List<Option> Options { get; set; }
        public bool RestrictToOptions { get; set; }        

        public bool Equals(DynamicParameterVM other)
        {
            if( other == null ) return false;
            return (this.ParentId == other.ParentId && this.Source == other.Source);

        }
        public override bool Equals(object obj)
        {
            if( obj == null ) return false;
            DynamicParameterVM objAsDynamicParameterVM = obj as DynamicParameterVM;
            if( objAsDynamicParameterVM == null ) return false;
            else return Equals( obj as DynamicParameterVM );
        }
        public override int GetHashCode()
        {
            int hashParentId = ParentId == null ? 0 : ParentId.GetHashCode();
            int hashSource = Source == null ? 0 : Source.GetHashCode();
            return hashParentId ^ hashSource;
        }
        //public string Value { get; set; }
        //public StatusType ExecuteCase { get; set; }
    }

}
